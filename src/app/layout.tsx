import type { Metadata, Viewport } from "next";
import "@fontsource-variable/rubik"; // self-hosted (works offline, no Google Fonts request)
import { AppShell } from "@/components/app-shell";
import { CourseProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "לומדה",
  description: "ניהול תהליך למידה אישי",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

// Applies the saved/system theme before paint to avoid a light→dark flash.
const themeScript = `try{var t=localStorage.getItem("lemidali:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CourseProvider>
          <AppShell>{children}</AppShell>
        </CourseProvider>
      </body>
    </html>
  );
}
