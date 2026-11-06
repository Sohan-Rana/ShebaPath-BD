"use client";

import { Card } from "@/components/ui/primitives";
import { useLang } from "@/lib/i18n";

export default function AboutPage() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t("ShebaPath BD সম্পর্কে", "About ShebaPath BD")}</h1>
      <p className="mt-3 text-navy-700">
        {t(
          "ShebaPath BD বাংলাদেশের নাগরিকদের সরকারি সেবার যোগ্যতা, প্রয়োজনীয় কাগজপত্র, সরকারি ফি ও আবেদনের ধাপ সহজ ভাষায় জানাতে তৈরি একটি তথ্য-সহায়ক প্ল্যাটফর্ম।",
          "ShebaPath BD is an information guide that explains eligibility, required documents, official fees and application steps for Bangladesh government services in plain language.",
        )}
      </p>
      <div className="mt-6 space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold">{t("আমরা যা করি না", "What we do not do")}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy-700">
            <li>{t("আমরা কোনো সরকারি প্রতিষ্ঠান নই।", "We are not a government body.")}</li>
            <li>{t("আমরা সরকারি আবেদনের রিয়েল-টাইম স্ট্যাটাস দেখাতে পারি না। ট্র্যাকারে আপনি নিজে তথ্য যোগ করেন।", "We cannot show real-time government application status. The tracker holds records you enter yourself.")}</li>
            <li>{t("যাচাই না হওয়া তথ্যের ভিত্তিতে AI উত্তর দেয় না।", "The AI does not answer from unverified information.")}</li>
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">{t("তথ্য যাচাই প্রক্রিয়া", "How we verify")}</h2>
          <p className="mt-2 text-sm text-navy-700">
            {t(
              "আমাদের অ্যাডমিন টিম অফিসিয়াল সূত্র দেখে তথ্য যাচাই করে এবং সর্বশেষ যাচাইয়ের তারিখ প্রকাশ করে। তথ্য পরিবর্তন হলে আবার যাচাই না করা পর্যন্ত তা AI-এর জ্ঞানভান্ডার থেকে সরে যায়।",
              "Our admin team checks details against official sources and publishes the last verified date. If a record is edited, it is removed from the AI knowledge base until it is verified again.",
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}
