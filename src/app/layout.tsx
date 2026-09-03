import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AuthCodeCatcher } from "@/components/auth/auth-code-catcher";
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
  icons: {
    // 180x180 mark for iOS "Add to Home Screen" / Web App — served as a static
    // file so the href is a plain, well-known path.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Suspense fallback={null}>
          <AuthCodeCatcher />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
