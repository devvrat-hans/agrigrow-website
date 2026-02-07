import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GlobalAIWidget, DesktopMobilePrompt } from "@/components/common";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "AgriGrow - Farmers Community & Knowledge Platform",
  description: "AgriGrow - Empowering Indian farmers with AI-powered insights, trusted peer knowledge, and modern farming techniques.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground transition-colors">
        {children}
        <GlobalAIWidget />
        <DesktopMobilePrompt />
      </body>
    </html>
  );
}
