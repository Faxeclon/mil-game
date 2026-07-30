import { redirect } from "@/i18n/navigation";

export default function IndexPage() {
  redirect({ href: "/", locale: "es" });
}

