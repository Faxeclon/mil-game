/**
 * The product's identity in one place. The PWA manifest declares its own copy, so if the
 * two ever disagree the app would install under one name and greet the child with
 * another; they are kept equal on purpose.
 */
export const appConfig = {
  name: "Kikiria",
  shortName: "Kikiria",
  defaultLocale: "es" as const
} as const;
