import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirada Digital",
  description: "An educational prototype for critical digital judgement."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

