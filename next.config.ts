import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
   * The development badge sits in the bottom corner, exactly where the game puts its
   * navigation bar. It only exists while developing, but it covers the very thing we
   * need to look at when checking the layout on a phone-sized screen.
   */
  devIndicators: false
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

