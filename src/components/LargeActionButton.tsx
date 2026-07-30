import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type LargeActionButtonProps = { href: "/" | "/worlds"; children: ReactNode };

export function LargeActionButton({ href, children }: LargeActionButtonProps) {
  return <Link className="large-action" href={href}>{children}<ArrowRight aria-hidden="true" size={23} /></Link>;
}

