import type { Metadata, Viewport } from "next";
import "@fontsource-variable/rubik"; // self-hosted fonts (work offline, no Google Fonts request)
import "@fontsource-variable/heebo";
import "@fontsource-variable/assistant";
import "@fontsource-variable/frank-ruhl-libre";
import "@fontsource/varela-round";
import { AppShell } from "@/components/app-shell";
import { AppearanceProvider } from "@/lib/appearance";
import { appearanceScript } from "@/lib/appearance-script";
import { AuthGate } from "@/lib/auth";
import { CourseProvider } from "@/lib/store";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "לומדה",
  description: "ניהול תהליך למידה אישי",
  manifest: `${BASE}/manifest.webmanifest`,
  icons: { icon: `${BASE}/favicon-64.png`, apple: `${BASE}/apple-touch-icon.png` },
  // "Add to Home Screen" opens full-screen, without Safari's address bar
  appleWebApp: { capable: true, title: "לומדה", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    // default theme (Energy); updated at runtime to the chosen theme
    { media: "(prefers-color-scheme: light)", color: "#fff7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1410" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" data-theme="energy" data-size="md" suppressHydrationWarning>
      <head>
        {/* applies the saved theme, mode and text size before paint (no flash) */}
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        <AppearanceProvider>
          <AuthGate>
            <CourseProvider>
              <AppShell>{children}</AppShell>
            </CourseProvider>
          </AuthGate>
        </AppearanceProvider>
      </body>
    </html>
  );
}
