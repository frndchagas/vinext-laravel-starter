import { AuthenticatedShell } from "@/components/authenticated-shell";
import { getSiteConfig } from "@/lib/site-config";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell siteName={getSiteConfig().name}>{children}</AuthenticatedShell>;
}
