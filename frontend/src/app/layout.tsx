import type { Metadata } from "next";
import { Geist, Geist_Mono, Albert_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toker — Transcription vidéo",
  description: "Transcrivez vos vidéos TikTok, Instagram et YouTube en texte en quelques secondes.",
  manifest: "/manifest.json",
  themeColor: "#F05800",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Toker",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${albertSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
