const DEFAULT_DISPLAY_DATE = "June 13";
const DATE_SEGMENT_PREFIX = "date=";
const DATE_PATTERN = /^(0[1-9]|1[0-2])-([0-2][0-9]|3[01])-(\d{4})$/;

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDateToken(token: string | undefined) {
  if (!token) {
    return DEFAULT_DISPLAY_DATE;
  }

  let decodedToken = token;

  try {
    decodedToken = decodeURIComponent(token);
  } catch {
    return DEFAULT_DISPLAY_DATE;
  }

  const normalizedToken = decodedToken.startsWith(DATE_SEGMENT_PREFIX)
    ? decodedToken.slice(DATE_SEGMENT_PREFIX.length)
    : decodedToken;
  const match = DATE_PATTERN.exec(normalizedToken);

  if (!match) {
    return DEFAULT_DISPLAY_DATE;
  }

  const monthIndex = Number(match[1]) - 1;
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return DEFAULT_DISPLAY_DATE;
  }

  return `${monthNames[monthIndex]} ${day}, ${year}`;
}

export function getDisplayDateFromSegment(segment: string | undefined) {
  return formatDateToken(segment);
}

export function getDisplayDateFromSearchParam(
  date: string | string[] | undefined,
) {
  return formatDateToken(Array.isArray(date) ? date[0] : date);
}
