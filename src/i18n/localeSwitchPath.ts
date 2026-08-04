type SearchParamsReader = Pick<URLSearchParams, "toString">;

/** Keeps the current URL query intact while next-intl changes only its locale prefix. */
export function getLocaleSwitchPath(pathname: string, searchParams: SearchParamsReader): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
