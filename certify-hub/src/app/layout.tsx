import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { UI_TEXT } from '@/constants/messages';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CertifyHub - Certificate Generation Platform",
  description: "A simple, public certificate hosting platform for grassroots organizers. Generate, host, and share verifiable certificates with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global navigation bar */}
        <nav className="w-full bg-white shadow fixed top-0 left-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-bold text-blue-700 hover:text-blue-900">
                {UI_TEXT.NAVIGATION.CERTIFY_HUB}
              </Link>
              <Link href="/certificate/generate" className="text-gray-700 hover:text-blue-700 font-medium">
                {UI_TEXT.NAVIGATION.GENERATE_CERTIFICATE}
              </Link>
            </div>
          </div>
        </nav>
        {/* Content area with top spacing */}
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
