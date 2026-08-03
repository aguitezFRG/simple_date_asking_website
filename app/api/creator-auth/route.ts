import { createSupabaseAuthClient, getCreatorAuthState } from "../../../lib/supabase/auth";
import { isValidEmailAddress } from "../../../lib/date-forms/schema";
import { getTrustedPublicOrigin } from "../../../lib/public-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
  const state = await getCreatorAuthState();
  return Response.json(
    state.status === "verified"
      ? { status: "verified", email: state.creator.email }
      : { status: state.status, email: state.status === "unverified" ? state.email : null },
    { headers: PRIVATE_HEADERS },
  );
}

export async function POST(request: Request) {
  let email = "";
  try {
    const payload = (await request.json()) as { email?: unknown };
    email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isValidEmailAddress(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseAuthClient();
    const redirectUrl = new URL(
      "/auth/confirm?next=/create",
      getTrustedPublicOrigin(request),
    ).toString();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl, shouldCreateUser: true },
    });

    if (error) {
      const isRateLimited = error.status === 429;
      return Response.json(
        {
          error: isRateLimited
            ? "Please wait before requesting another verification email."
            : "Unable to send the verification email.",
        },
        { status: isRateLimited ? 429 : 502, headers: PRIVATE_HEADERS },
      );
    }

    return Response.json(
      { status: "sent", message: "Verification email sent." },
      { headers: PRIVATE_HEADERS },
    );
  } catch {
    return Response.json(
      { error: "Email verification is not configured." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseAuthClient();
    await supabase.auth.signOut();
    return Response.json({ status: "signed_out" }, { headers: PRIVATE_HEADERS });
  } catch {
    return Response.json(
      { error: "Unable to sign out." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
