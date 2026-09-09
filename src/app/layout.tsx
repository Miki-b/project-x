import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Space_Grotesk, Manrope, Sora } from "next/font/google";
import "./globals.css";

// Default pairing: display (headings) + body. Chosen to feel crafted rather than default-issue.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});
const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Extra font presets an org can switch to in Settings (applied via a CSS-var override).
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Soso",
  description: "Soso — a simple task and daily-work manager. By ApexHub Labs.",
};

// Set the theme class before first paint so there is no light/dark flash.
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${space.variable} ${manrope.variable} ${sora.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
