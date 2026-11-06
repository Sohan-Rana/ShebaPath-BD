"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="mt-16 border-t border-navy-100 bg-navy-950 text-navy-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">
            Sheba<span className="text-brand-400">Path</span> BD
          </p>
          <p className="mt-2 text-sm text-navy-200">
            {t(
              "বাংলাদেশের নাগরিকদের জন্য সরকারি সেবার তথ্য সহজে খুঁজে পাওয়ার প্ল্যাটফর্ম।",
              "A platform that helps Bangladeshi citizens find government service information easily.",
            )}
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">{t("দ্রুত লিংক", "Quick links")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link className="hover:text-white" href="/services">{t("সেবাসমূহ", "Services")}</Link></li>
            <li><Link className="hover:text-white" href="/assistant">{t("AI সহকারী", "AI Assistant")}</Link></li>
            <li><Link className="hover:text-white" href="/about">{t("সম্পর্কে", "About")}</Link></li>
            <li><Link className="hover:text-white" href="/contact">{t("যোগাযোগ", "Contact")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">{t("গুরুত্বপূর্ণ নোট", "Important note")}</p>
          <p className="mt-2 text-sm text-navy-200">
            {t(
              "ShebaPath একটি বেসরকারি তথ্য-সহায়ক প্ল্যাটফর্ম, সরকারি ওয়েবসাইট নয়। আবেদনের আগে সবসময় অফিসিয়াল সূত্র যাচাই করুন।",
              "ShebaPath is an independent information guide, not a government website. Always confirm details with the official source before applying.",
            )}
          </p>
        </div>
      </div>
      <div className="border-t border-navy-800 py-4 text-center text-xs text-navy-300">
        © {new Date().getFullYear()} ShebaPath BD
      </div>
    </footer>
  );
}
