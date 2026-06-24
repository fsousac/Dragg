export function getSafeRedirectPath(next: string | null): string {
  if (!next) {
    return "/dashboard";
  }

  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    next.includes("\n") ||
    next.includes("\r")
  ) {
    return "/dashboard";
  }

  return next;
}
