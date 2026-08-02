import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import DemoPage from "../app/demo/page";
import FormBuilder from "../app/create/form-builder";
import CustomDateForm from "../app/form/[publicId]/custom-date-form";
import ExpiredDateForm from "../app/form/[publicId]/expired-form";
import { BUILDER_DRAFT_STORAGE_KEY } from "../lib/date-forms/builder-draft";
import {
  createDemoBuilderConfiguration,
  DEMO_DATE_FORM_CONFIGURATION,
} from "../lib/date-forms/demo";
import { validConfiguration } from "./fixtures";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));

function authResponse(status: "verified" | "signed_out" = "signed_out") {
  return new Response(
    JSON.stringify(
      status === "verified"
        ? { status, email: "creator@example.com" }
        : { status, email: null },
    ),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  navigation.push.mockReset();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse()));
});

describe("landing and reusable demo", () => {
  it("offers the builder and demo entry choices", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Make Your Own Date Form" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "View Demo" })).toHaveAttribute("href", "/demo");
  });

  it("carries a legacy date into demo mode and adds direct home navigation", async () => {
    render(await Home({ searchParams: Promise.resolve({ date: "07-13-2026" }) }));
    expect(screen.getByRole("link", { name: "View Demo" })).toHaveAttribute("href", "/demo?date=07-13-2026");
    render(await DemoPage({ searchParams: Promise.resolve({ date: "07-13-2026" }) }));
    expect(screen.getByText("July 13, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "Use Demo Form" })).toBeInTheDocument();
  });

  it("loads the demo into the builder without publishing and protects an unsaved draft", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    sessionStorage.setItem(BUILDER_DRAFT_STORAGE_KEY, JSON.stringify(validConfiguration()));
    render(await DemoPage({ searchParams: Promise.resolve({}) }));
    fireEvent.click(screen.getByRole("button", { name: "Use Demo Form" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(navigation.push).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Use Demo Form" }));
    expect(navigation.push).toHaveBeenCalledWith("/create?preset=demo");
    expect(fetch).not.toHaveBeenCalledWith("/api/date-forms", expect.anything());
  });

  it("deeply clones the shared demo while regenerating IDs and stripping metadata", () => {
    let id = 0;
    const clone = createDemoBuilderConfiguration((prefix) => `${prefix}_fresh_${++id}`);
    clone.steps[0].title = "Changed";
    clone.steps[0].fields[0].options?.push("New option");

    expect(DEMO_DATE_FORM_CONFIGURATION.steps[0].title).toBe("Date details");
    expect(DEMO_DATE_FORM_CONFIGURATION.steps[0].fields[0].options).not.toContain("New option");
    expect(clone.steps[0].id).not.toBe(DEMO_DATE_FORM_CONFIGURATION.steps[0].id);
    expect(clone.steps[0].fields[0].id).not.toBe(DEMO_DATE_FORM_CONFIGURATION.steps[0].fields[0].id);
    expect(JSON.stringify(clone)).not.toMatch(/creator|created_at|expires_at|submission|metadata|email/i);
  });

  it("renders the permanent respondent email in the demo", async () => {
    render(await DemoPage({ searchParams: Promise.resolve({}) }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByLabelText("Your email")).toHaveAttribute("type", "email");
    expect(screen.queryByLabelText("Recipient Email")).not.toBeInTheDocument();
  });
});

describe("custom form builder layout and navigation", () => {
  it("keeps one Add Step control immediately after the final step through mutations", () => {
    render(<FormBuilder />);
    const addStep = screen.getByRole("button", { name: "Add step after final step" });
    expect(screen.getAllByRole("button", { name: "Add step after final step" })).toHaveLength(1);
    const firstStep = screen.getByRole("region", { name: "Step 1 editor" });
    expect(firstStep.compareDocumentPosition(addStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(addStep);
    const secondStep = screen.getByRole("region", { name: "Step 2 editor" });
    expect(secondStep.compareDocumentPosition(addStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(secondStep).getByRole("button", { name: "Move step 2 up" }));
    const finalStepAfterMove = screen.getByRole("region", { name: "Step 2 editor" });
    expect(finalStepAfterMove.compareDocumentPosition(addStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(finalStepAfterMove).getByRole("button", { name: "Remove step 2" }));
    expect(screen.getByRole("region", { name: "Step 1 editor" }).compareDocumentPosition(addStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps Add Element scoped to each step and explains both limits", () => {
    render(<FormBuilder />);
    const addStep = screen.getByRole("button", { name: "Add step after final step" });
    fireEvent.click(addStep);
    fireEvent.click(addStep);
    expect(addStep).toBeDisabled();
    expect(screen.getByText("A form can contain a maximum of 3 steps.")).toBeInTheDocument();

    const firstStep = screen.getByRole("region", { name: "Step 1 editor" });
    expect(within(firstStep).getByRole("button", { name: "Add element to step 1" })).toBeInTheDocument();
    for (let count = 3; count < 10; count += 1) {
      fireEvent.click(within(firstStep).getByRole("button", { name: "Add element to step 1" }));
    }
    expect(screen.getByText("Maximum of 10 configurable elements reached.")).toBeInTheDocument();
    screen.getAllByRole("button", { name: /Add element to step/ }).forEach((button) => expect(button).toBeDisabled());
  });

  it("shows the locked respondent field without counting or editing controls", () => {
    render(<FormBuilder />);
    const systemSection = screen.getByRole("region", { name: "System-managed respondent information" });
    expect(within(systemSection).getByText("Your email", { exact: false })).toBeInTheDocument();
    expect(within(systemSection).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/1\/10 configurable elements/)).toBeInTheDocument();
  });

  it("warns only when meaningful unsaved builder changes would be lost", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<FormBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(navigation.push).toHaveBeenCalledWith("/");

    navigation.push.mockReset();
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Changed title" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(navigation.push).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigation.push).toHaveBeenCalledWith("/");
  });
});

describe("creator verification and publication", () => {
  it("prevents an unverified creator from publishing", async () => {
    render(<FormBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
    expect(await screen.findByText("Preview before finalization")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize and create link" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back to Home" })).toBeInTheDocument();
  });

  it("reuses a verified session, publishes, and shows the exact success details", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "/api/creator-auth") return authResponse("verified");
      if (input === "/api/date-forms" && init?.method === "POST") {
        return new Response(JSON.stringify({
          publicId: "f_abcdefghijklmnopqrstuvwx",
          url: "/form/f_abcdefghijklmnopqrstuvwx",
          expiresAt: "2026-08-06T00:00:00.000Z",
        }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<FormBuilder />);
    expect(await screen.findByText(/Email verified: creator@example.com/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
    fireEvent.click(screen.getByRole("button", { name: "Finalize and create link" }));
    expect(await screen.findByRole("heading", { name: "Save your generated URL" })).toBeInTheDocument();
    expect(screen.getByText("http://localhost:3000/form/f_abcdefghijklmnopqrstuvwx")).toBeInTheDocument();
    expect(screen.getByText(/This form expires three days after creation/)).toBeInTheDocument();
    expect(screen.getByText(/cannot recover the form/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Home" })).toBeInTheDocument();
  });

  it("sends verification once and enforces the resend cooldown", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "/api/creator-auth" && init?.method === "POST") {
        return new Response(JSON.stringify({ status: "sent", message: "Verification email sent." }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return authResponse();
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<FormBuilder />);
    expect(await screen.findByText("Email not provided.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Creator email"), { target: { value: "creator@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send verification email" }));
    expect(await screen.findByRole("button", { name: /Resend in 60s/ })).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
});

describe("saved form rendering", () => {
  it("requires a valid respondent email and submits it separately", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomDateForm publicId="f_abcdefghijklmnopqrstuvwx" configuration={validConfiguration()} expiresAt="2026-08-06T00:00:00.000Z" />);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.change(screen.getByLabelText("Question 1"), { target: { value: "Absolutely" } });
    fireEvent.click(screen.getByRole("button", { name: "Send response" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Your email is required");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Send response" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid email");

    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: " Respondent@Example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Send response" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      respondentEmail: "Respondent@Example.com",
      answers: { field_1: "Absolutely" },
    });
    expect(await screen.findByRole("heading", { name: "See you there!" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
  });

  it("renders an expired form without fields and with direct home navigation", () => {
    render(<ExpiredDateForm />);
    expect(screen.getByRole("heading", { name: "This form has expired" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
  });
});
