import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AuthCodeCatcher } from "@/components/auth/auth-code-catcher";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "elovate",
    template: "%s | elovate",
  },
  description:
    "Top 250 cutoff tracker for Ranked Multiplayer and Warzone. Cutoff SR, daily drift, full board.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Suspense fallback={null}>
          <AuthCodeCatcher />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
