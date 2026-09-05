import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "synod — concurrent research swarm",
  description: "Ask once. A swarm of agents answers at the same time. synod runs discovery, verification and synthesis agents in parallel on a shared event bus, built on the Mozaik runtime.",
  keywords: ["AI agents", "concurrent agents", "research", "Mozaik", "TypeScript", "event bus", "swarm"],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: "synod",
    description: "Concurrent research swarm, built on Mozaik.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "synod — concurrent research swarm",
    description: "Ask once. A swarm of agents answers at the same time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
