import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import "./globals.css";

export const metadata: Metadata = { title: "Pluto template", description: "A static Next.js web app" };
// viewport-fit=cover lets the page draw under the notch; the safe-area variables then pad it
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
