import DateInvitation from "./date-invitation";
import { getDisplayDateFromSearchParam } from "./display-date";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;

  return <DateInvitation displayDate={getDisplayDateFromSearchParam(date)} />;
}
