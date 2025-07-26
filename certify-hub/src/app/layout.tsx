import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '../contexts/AuthContext';
import NavigationBar from '../components/NavigationBar';

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
        <AuthProvider>
          <NavigationBar />
          {/* Content area with top spacing */}
          <div className="pt-16">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
