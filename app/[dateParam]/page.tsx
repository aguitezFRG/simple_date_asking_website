import DateInvitation from "../date-invitation";
import { getDisplayDateFromSegment } from "../display-date";

export default async function DatePage({
  params,
}: {
  params: Promise<{ dateParam: string }>;
}) {
  const { dateParam } = await params;

  return <DateInvitation displayDate={getDisplayDateFromSegment(dateParam)} />;
}
