import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthClient } from "../../../lib/supabase/auth";

export const runtime = "nodejs";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
]);

function getPublicOrigin(request: NextRequest) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // Fall through to proxy headers when the configured value is invalid.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || (host?.includes("localhost") ? "http" : "https");

  if (host) return `${protocol}://${host}`;
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next") === "/create" ? "/create" : "/create";
  const publicOrigin = getPublicOrigin(request);
  const successUrl = new URL(`${next}?auth=verified`, publicOrigin);
  const errorUrl = new URL(`${next}?auth=expired`, publicOrigin);

  try {
    const supabase = await createSupabaseAuthClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type && EMAIL_OTP_TYPES.has(type)
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : { error: new Error("Missing verification token.") };

    if (result.error) return NextResponse.redirect(errorUrl, 303);
    const response = NextResponse.redirect(successUrl, 303);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.redirect(errorUrl, 303);
  }
}
