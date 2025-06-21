import "@livekit/components-styles";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionWrapper } from "@/components/SessionWrapper";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AIVoice Network - Voice-Enabled Contact Search",
  description: "Search your personal and professional networks using natural voice commands. Find friends, colleagues, and connections instantly with AI-powered insights.",
  keywords: "voice search, networking, AI, contacts, friends, social network, personal network",
  authors: [{ name: "AIVoice Network" }],
  openGraph: {
    title: "AIVoice Network - Voice-Enabled Contact Search",
    description: "Search your personal and professional networks using natural voice commands. Find friends, colleagues, and connections instantly with AI-powered insights.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIVoice Network - Voice-Enabled Contact Search",
    description: "Search your personal and professional networks using natural voice commands. Find friends, colleagues, and connections instantly with AI-powered insights.",
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <body className="h-full font-sans">
        <SessionWrapper>
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}
