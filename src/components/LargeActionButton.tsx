import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type LargeActionButtonProps = {
  href: "/" | "/worlds" | "/tutorial";
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function LargeActionButton({ href, children, variant = "primary" }: LargeActionButtonProps) {
  return <Link className={`large-action large-action--${variant}`} href={href}>{children}<ArrowRight aria-hidden="true" size={23} /></Link>;
}
