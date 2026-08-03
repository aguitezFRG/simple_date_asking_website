// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  createSupabaseAuthClient: vi.fn(),
  getCreatorAuthState: vi.fn(),
  signInWithOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../lib/supabase/auth", () => ({
  createSupabaseAuthClient: auth.createSupabaseAuthClient,
  getCreatorAuthState: auth.getCreatorAuthState,
}));

import {
  DELETE as signOutCreator,
  GET as getCreatorStatus,
  POST as requestCreatorVerification,
} from "../app/api/creator-auth/route";
import { GET as confirmCreatorEmail } from "../app/auth/confirm/route";

const PUBLIC_SITE_URL = "https://simple-date-asking-website.vercel.app";
const CUSTOM_SITE_URL = "https://wybmd.frgagz.com";

beforeEach(() => {
  Object.values(auth).forEach((mock) => mock.mockReset());
  auth.createSupabaseAuthClient.mockResolvedValue({
    auth: {
      signInWithOtp: auth.signInWithOtp,
      exchangeCodeForSession: auth.exchangeCodeForSession,
      verifyOtp: auth.verifyOtp,
      signOut: auth.signOut,
    },
  });
  auth.getCreatorAuthState.mockResolvedValue({ status: "signed_out" });
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

describe("creator verification API", () => {
  it("returns a private trusted status for returning and expired sessions", async () => {
    auth.getCreatorAuthState.mockResolvedValueOnce({
      status: "verified",
      creator: { userId: "trusted-user", email: "creator@example.com" },
    });
    const verified = await getCreatorStatus();
    expect(await verified.json()).toEqual({ status: "verified", email: "creator@example.com" });
    expect(verified.headers.get("cache-control")).toBe("private, no-store");

    auth.getCreatorAuthState.mockResolvedValueOnce({ status: "signed_out" });
    const expired = await getCreatorStatus();
    expect(await expired.json()).toEqual({ status: "signed_out", email: null });
  });

  it("normalizes the email and preserves a trusted custom origin", async () => {
    const response = await requestCreatorVerification(new Request(`${CUSTOM_SITE_URL}/api/creator-auth`, {
      method: "POST",
      body: JSON.stringify({
        email: " Creator@Example.com ",
        email_verified: true,
        creator_user_id: "forged-user",
      }),
    }));

    expect(response.status).toBe(200);
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "creator@example.com",
      options: {
        emailRedirectTo: `${CUSTOM_SITE_URL}/auth/confirm?next=/create`,
        shouldCreateUser: true,
      },
    });
    expect(auth.signInWithOtp.mock.calls[0][0]).not.toHaveProperty("email_verified");
    expect(auth.signInWithOtp.mock.calls[0][0]).not.toHaveProperty("creator_user_id");
  });

  it("falls back to the canonical Vercel origin for an untrusted host", async () => {
    await requestCreatorVerification(new Request("https://attacker.example/api/creator-auth", {
      method: "POST",
      body: JSON.stringify({ email: "creator@example.com" }),
    }));

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "creator@example.com",
      options: {
        emailRedirectTo: `${PUBLIC_SITE_URL}/auth/confirm?next=/create`,
        shouldCreateUser: true,
      },
    });
  });

  it("maps duplicate provider requests to a clear cooldown response", async () => {
    auth.signInWithOtp.mockResolvedValueOnce({ error: { status: 429 } });
    const response = await requestCreatorVerification(new Request(`${PUBLIC_SITE_URL}/api/creator-auth`, {
      method: "POST",
      body: JSON.stringify({ email: "creator@example.com" }),
    }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Please wait before requesting another verification email.",
    });
  });

  it("signs out an expired or unwanted session without exposing state", async () => {
    const response = await signOutCreator();
    expect(response.status).toBe(200);
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});

describe("creator verification callback", () => {
  it("exchanges a PKCE code and returns to the trusted callback origin", async () => {
    const response = await confirmCreatorEmail(new NextRequest(
      `${CUSTOM_SITE_URL}/auth/confirm?code=trusted-code&next=https://attacker.example`,
    ));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("trusted-code");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${CUSTOM_SITE_URL}/create?auth=verified`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("accepts supported token hashes and reports invalid or expired links", async () => {
    const valid = await confirmCreatorEmail(new NextRequest(
      "https://wybmd.cntest.uk/auth/confirm?token_hash=trusted-hash&type=magiclink",
    ));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "trusted-hash", type: "magiclink" });
    expect(valid.headers.get("location")).toBe("https://wybmd.cntest.uk/create?auth=verified");

    auth.verifyOtp.mockResolvedValueOnce({ error: new Error("expired") });
    const expired = await confirmCreatorEmail(new NextRequest(
      `${PUBLIC_SITE_URL}/auth/confirm?token_hash=expired-hash&type=email`,
    ));
    expect(expired.status).toBe(303);
    expect(expired.headers.get("location")).toBe(`${PUBLIC_SITE_URL}/create?auth=expired`);

    const unsupported = await confirmCreatorEmail(new NextRequest(
      "https://attacker.example/auth/confirm?token_hash=hash&type=phone",
    ));
    expect(unsupported.headers.get("location")).toBe(`${PUBLIC_SITE_URL}/create?auth=expired`);
  });
});
