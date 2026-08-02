export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { error: "Demo responses are not delivered. Use Demo Form to create a verified form." },
    { status: 410 },
  );
}
