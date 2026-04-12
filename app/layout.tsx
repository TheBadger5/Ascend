import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "./top-nav";
import AuthGuard from "./auth-guard";
import { PaidAccessProvider } from "@/lib/paid-access-provider";
import PaidAccessDebugPanel from "./paid-access-debug-panel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ascend",
  description: "Daily discipline tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <AuthGuard>
          <PaidAccessProvider>
            <TopNav />
            <main className={`flex-1 ${process.env.NODE_ENV === "development" ? "pb-40" : ""}`}>{children}</main>
            <PaidAccessDebugPanel />
          </PaidAccessProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
