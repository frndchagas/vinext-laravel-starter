import { Figtree } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";

import { Toaster } from "@/components/ds/toast";
import { NavigationProgress } from "@/components/navigation/navigation-progress";
import { createRootMetadata } from "@/lib/site-config";
import { cn } from "@/lib/utils";

import { Providers } from "./providers";

// Figtree (Google Fonts, SIL OFL 1.1), the single interface font: downloaded at build time and served
// by Vinext itself, with no request to Google from the browser.
const figtree = Figtree({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = createRootMetadata();

const appearanceScript = `(() => {
  try {
    const stored = localStorage.getItem("appearance");
    const appearance = ["light", "dark", "system"].includes(stored) ? stored : "light";
    const dark = appearance === "dark" || (appearance === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch {}
})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const appearance = (await cookies()).get("appearance")?.value;
  const explicitAppearance =
    appearance === "light" || appearance === "dark" ? appearance : undefined;

  return (
    <html
      className={cn(figtree.variable, explicitAppearance === "dark" ? "dark" : undefined)}
      data-scroll-behavior="smooth"
      lang="en"
      style={explicitAppearance ? { colorScheme: explicitAppearance } : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <NavigationProgress />
        <Toaster />
      </body>
    </html>
  );
}
