import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type VerifiedCreator = {
  userId: string;
  email: string;
};

export type CreatorAuthState =
  | { status: "verified"; creator: VerifiedCreator }
  | { status: "unverified"; email: string | null }
  | { status: "signed_out" }
  | { status: "unavailable" };

export class SupabaseAuthConfigurationError extends Error {}

function getAuthEnvironment() {
  const url = process.env.SUPABASE_PROJECT_URL;
  const publishableKey = process.env.SUPABASE_PUBLIC_KEY;
  if (!url || !publishableKey) {
    throw new SupabaseAuthConfigurationError("Supabase Auth is not configured.");
  }
  return { url, publishableKey };
}

export async function createSupabaseAuthClient() {
  const { url, publishableKey } = getAuthEnvironment();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function getCreatorAuthState(): Promise<CreatorAuthState> {
  let supabase;
  try {
    supabase = await createSupabaseAuthClient();
  } catch (error) {
    if (error instanceof SupabaseAuthConfigurationError) {
      return { status: "unavailable" };
    }
    throw error;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "signed_out" };

  const email = data.user.email?.trim().toLowerCase() ?? null;
  if (!email || !data.user.email_confirmed_at) {
    return { status: "unverified", email };
  }

  return {
    status: "verified",
    creator: { userId: data.user.id, email },
  };
}

export async function requireVerifiedCreator(): Promise<VerifiedCreator | null> {
  const state = await getCreatorAuthState();
  return state.status === "verified" ? state.creator : null;
}
