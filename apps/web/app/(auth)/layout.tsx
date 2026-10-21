import Link from "next/link";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block font-[family-name:var(--font-app-display)] text-xl text-muted-foreground hover:text-foreground"
        >
          Vinext Laravel Starter
        </Link>
        {children}
      </div>
    </main>
  );
}
