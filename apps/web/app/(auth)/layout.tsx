import { Wordmark } from "@/components/brand";
import { getSiteConfig } from "@/lib/site-config";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = getSiteConfig();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Wordmark className="mx-auto w-fit" name={site.name} />
        <div className="rounded-card border border-border bg-card p-card shadow-card">
          {children}
        </div>
        <p className="text-center text-caption text-pretty text-muted-foreground">
          {site.description}
        </p>
      </div>
    </main>
  );
}
