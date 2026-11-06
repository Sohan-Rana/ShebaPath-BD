"use client";

import { Mail } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { useLang } from "@/lib/i18n";

// TODO: nijer asol contact email boshan
const CONTACT_EMAIL = "contact@example.com";

export default function ContactPage() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t("যোগাযোগ", "Contact")}</h1>
      <p className="mt-3 text-navy-700">
        {t(
          "কোনো তথ্য ভুল মনে হলে বা পরামর্শ থাকলে আমাদের জানান।",
          "Tell us if something looks wrong or if you have a suggestion.",
        )}
      </p>
      <Card className="mt-6 flex items-center gap-3 p-5">
        <Mail className="h-5 w-5 text-brand-600" aria-hidden />
        <a className="font-medium text-brand-700 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </Card>
      <p className="mt-4 text-sm text-navy-600">
        {t(
          "সরকারি আবেদনের স্ট্যাটাস বা ব্যক্তিগত সমস্যার জন্য সংশ্লিষ্ট সরকারি কর্তৃপক্ষের সাথে সরাসরি যোগাযোগ করুন।",
          "For government application status or personal cases, contact the relevant authority directly.",
        )}
      </p>
    </div>
  );
}
