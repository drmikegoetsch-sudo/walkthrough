import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Soter Walkthrough",
  description: "Facility inspection waypoints, walks, and photo review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-ink font-sans">
        {children}
        <Toaster position="top-center" duration={2000} />
      </body>
    </html>
  );
}
