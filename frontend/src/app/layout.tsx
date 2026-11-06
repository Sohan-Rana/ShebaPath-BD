import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: { default: "ShebaPath BD — সরকারি সেবার পথনির্দেশিকা", template: "%s | ShebaPath BD" },
  description:
    "বাংলাদেশের সরকারি সেবার যোগ্যতা, কাগজপত্র, ফি ও আবেদনের ধাপ সহজ বাংলা ও ইংরেজিতে জানুন। Find eligibility, documents, fees and steps for Bangladesh government services.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <LangProvider>
          <AuthProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
            >
              Skip to content
            </a>
            <Navbar />
            <main id="main" className="min-h-[70vh]">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
