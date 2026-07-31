type SupabaseRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: URLSearchParams;
  prefer?: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Supabase is not configured.");
  }

  return { secretKey, url };
}

export async function supabaseServerRequest<T>(
  table: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { secretKey, url } = getSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/${encodeURIComponent(table)}`);

  if (options.query) {
    endpoint.search = options.query.toString();
  }

  const response = await fetch(endpoint, {
    method: options.method ?? "GET",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
