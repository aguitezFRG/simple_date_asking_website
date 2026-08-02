import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import DemoPage from "../app/demo/page";
import FormBuilder from "../app/create/form-builder";
import CustomDateForm from "../app/form/[publicId]/custom-date-form";
import { validConfiguration } from "./fixtures";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  navigation.push.mockReset();
  vi.unstubAllGlobals();
});

describe("landing and demo regression", () => {
  it("offers exactly the two requested entry choices", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Make Your Own Date Form" })).toHaveAttribute(
      "href",
      "/create",
    );
    expect(screen.getByRole("link", { name: "View Demo" })).toHaveAttribute("href", "/demo");
  });

  it("carries a legacy root date query into demo mode", async () => {
    render(await Home({ searchParams: Promise.resolve({ date: "07-13-2026" }) }));
    expect(screen.getByRole("link", { name: "View Demo" })).toHaveAttribute(
      "href",
      "/demo?date=07-13-2026",
    );
  });

  it("renders the existing default invitation without storage configuration", async () => {
    render(await DemoPage({ searchParams: Promise.resolve({ date: "07-13-2026" }) }));
    expect(screen.getByText("July 13, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Would you like to be my date?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByLabelText("Your Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Recipient Email")).toBeInTheDocument();
  });
});

describe("custom form builder", () => {
  function enterEmails() {
    fireEvent.change(screen.getByLabelText("Sender email"), {
      target: { value: "sender@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Recipient email"), {
      target: { value: "recipient@example.com" },
    });
  }

  it("prevents incomplete forms from reaching preview", () => {
    render(<FormBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid sender email address");
    expect(screen.queryByText("Preview before finalization")).not.toBeInTheDocument();
  });

  it("enforces three steps and ten elements with clear feedback", () => {
    render(<FormBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "+ Step" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Step" }));
    expect(screen.getByText("Maximum of 3 steps reached.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Step" })).toBeDisabled();

    for (let count = 3; count < 10; count += 1) {
      fireEvent.click(screen.getAllByRole("button", { name: "+ Element" })[0]);
    }
    expect(screen.getByText("Maximum of 10 elements reached.")).toBeInTheDocument();
    screen.getAllByRole("button", { name: "+ Element" }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("supports editing, reordering, assigning, removing, previewing, and saving", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ publicId: "f_abcdefghijklmnopqrstuvwx", url: "/form/f_abcdefghijklmnopqrstuvwx" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<FormBuilder />);
    enterEmails();

    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Favorite plan" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Element" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Step" }));

    const assignments = screen.getAllByLabelText("Assign to step");
    fireEvent.change(assignments[1], { target: { value: "1" } });
    expect(screen.getAllByText("Element 1")).toHaveLength(2);

    const firstStep = screen.getByText("Step 1 title").closest("section");
    expect(firstStep).not.toBeNull();
    fireEvent.click(within(firstStep!).getByRole("button", { name: "+ Element" }));
    const secondFieldset = within(firstStep!).getAllByRole("group")[1];
    fireEvent.click(within(secondFieldset).getByRole("button", { name: "Remove" }));

    fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
    expect(screen.getByText("Preview before finalization")).toBeInTheDocument();
    expect(screen.getByText(/Favorite plan/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finalize and create link" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(navigation.push).toHaveBeenCalledWith(
      "/form/f_abcdefghijklmnopqrstuvwx?created=1",
    );
  });
});

describe("saved form rendering", () => {
  it("renders a saved wizard and submits its validated answers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const configuration = validConfiguration();
    render(
      <CustomDateForm
        publicId="f_abcdefghijklmnopqrstuvwx"
        configuration={configuration}
        showShareNotice={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.change(screen.getByLabelText("Question 1"), { target: { value: "Absolutely" } });
    fireEvent.click(screen.getByRole("button", { name: "Send response" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/date-forms/f_abcdefghijklmnopqrstuvwx/responses",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByRole("heading", { name: "See you there!" })).toBeInTheDocument();
  });
});
