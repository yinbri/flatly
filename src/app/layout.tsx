import type { Metadata } from "next";
import { Geist_Mono, Inter_Tight } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// A neo-grotesque in the vein of Soehne / Uber Move: tight, low contrast, quiet.
const sans = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "flatly — wardrobe & flat lay studio",
  description:
    "Keep your clothes as cut-out PNGs and style them into flat lay outfit boards, all on your own device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <body className="overflow-hidden font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
