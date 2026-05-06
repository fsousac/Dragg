export function getMonthFromSearchParams(searchParams: URLSearchParams) {
  const month = searchParams.get("month");

  return month?.match(/^\d{4}-\d{2}$/) ? month : null;
}

export function withSelectedMonth(
  href: string,
  searchParams: URLSearchParams,
) {
  const month = getMonthFromSearchParams(searchParams);

  if (!month) {
    return href;
  }

  const [pathname, query = ""] = href.split("?");
  const nextSearchParams = new URLSearchParams(query);
  nextSearchParams.set("month", month);
  const nextQuery = nextSearchParams.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}
