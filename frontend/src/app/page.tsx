"use client";

import Link from "next/link";
import { BadgeCheck, Bot, ClipboardList, ShieldCheck } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { ServiceCard } from "@/components/service-card";
import { CategoryIcon } from "@/components/category-icon";
import { CardGridSkeleton, ErrorState, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { useFetch } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { Category, Page, ServiceListItem } from "@/lib/types";

export default function HomePage() {
  const { t, pick, lang } = useLang();
  const popular = useFetch<Page<ServiceListItem>>("/api/services?popular=true&page_size=6");
  const cats = useFetch<Category[]>("/api/categories");
  const latest = useFetch<Page<ServiceListItem>>("/api/services?page_size=50");

  const verified = (latest.data?.items ?? [])
    .filter((s) => s.last_verified_at)
    .sort((a, b) => (b.last_verified_at ?? "").localeCompare(a.last_verified_at ?? ""))
    .slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-navy-900 to-navy-800 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-24">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            <ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden />
            {t("যাচাইকৃত অফিসিয়াল সূত্রভিত্তিক তথ্য", "Information based on verified official sources")}
          </p>
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">
            {t("সরকারি সেবা পেতে সঠিক পথ খুঁজে নিন", "Find the right path to government services")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-navy-100">
            {t(
              "যোগ্যতা, প্রয়োজনীয় কাগজপত্র, সরকারি ফি ও আবেদনের ধাপ — সহজ বাংলা ও ইংরেজিতে।",
              "Eligibility, required documents, official fees and application steps — in simple Bangla and English.",
            )}
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <SearchBox large />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-navy-200">
            <span>{t("জনপ্রিয়:", "Popular:")}</span>
            {[
              ["পাসপোর্ট", "passport"],
              ["জন্মনিবন্ধন", "birth"],
              ["ড্রাইভিং লাইসেন্স", "driving"],
              ["TIN", "tin"],
            ].map(([label, q]) => (
              <Link key={q} href={`/services?q=${encodeURIComponent(label)}`} className="rounded-full bg-white/10 px-3 py-0.5 hover:bg-white/20">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust points */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        {[
          {
            icon: BadgeCheck,
            bn: ["যাচাইকৃত তথ্য", "প্রতিটি সেবার তথ্যে সর্বশেষ যাচাইয়ের তারিখ ও অফিসিয়াল সূত্র দেওয়া থাকে।"],
            en: ["Verified information", "Every service shows its last verified date and official sources."],
          },
          {
            icon: Bot,
            bn: ["AI সহকারী", "বাংলা বা ইংরেজিতে প্রশ্ন করুন। যাচাইকৃত তথ্য না থাকলে AI অনুমান করে না।"],
            en: ["AI assistant", "Ask in Bangla or English. The AI never guesses when verified data is missing."],
          },
          {
            icon: ClipboardList,
            bn: ["আবেদন ট্র্যাকার", "আপনার আবেদনের রেফারেন্স, তারিখ ও নোট নিজেই সংরক্ষণ করুন।"],
            en: ["Application tracker", "Keep your own record of reference numbers, dates and notes."],
          },
        ].map((f) => (
          <Card key={f.en[0]} className="flex gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <f.icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-navy-900">{lang === "bn" ? f.bn[0] : f.en[0]}</h2>
              <p className="mt-1 text-sm text-navy-600">{lang === "bn" ? f.bn[1] : f.en[1]}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="mb-4 text-2xl font-bold">{t("সেবার ক্যাটাগরি", "Service categories")}</h2>
        {cats.loading ? (
          <CardGridSkeleton count={6} />
        ) : cats.error ? (
          <ErrorState message={cats.error} onRetry={cats.reload} />
        ) : !cats.data?.length ? (
          <EmptyState title={t("এখনো কোনো ক্যাটাগরি নেই", "No categories yet")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cats.data.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} className="group rounded-2xl">
                <Card className="flex items-center gap-4 p-4 transition-shadow group-hover:shadow-md">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-900 text-white">
                    <CategoryIcon name={c.icon} className="h-6 w-6" />
                  </span>
                  <span className="font-semibold">{pick(c.name_bn, c.name_en)}</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Popular services */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t("জনপ্রিয় সরকারি সেবা", "Popular government services")}</h2>
          <Button asChild variant="link">
            <Link href="/services">{t("সব দেখুন", "View all")}</Link>
          </Button>
        </div>
        {popular.loading ? (
          <CardGridSkeleton />
        ) : popular.error ? (
          <ErrorState message={popular.error} onRetry={popular.reload} />
        ) : !popular.data?.items.length ? (
          <EmptyState
            title={t("এখনো কোনো সেবা যোগ করা হয়নি", "No services have been added yet")}
            hint={t("অ্যাডমিন সেবা যোগ করলে এখানে দেখা যাবে।", "Services will appear here once an admin adds them.")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.data.items.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      {/* Latest verified */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <h2 className="mb-4 text-2xl font-bold">{t("সর্বশেষ যাচাইকৃত তথ্য", "Latest verified information")}</h2>
        {verified.length === 0 ? (
          <EmptyState
            title={t("এখনো কোনো তথ্য যাচাই হয়নি", "Nothing has been verified yet")}
            hint={t(
              "অ্যাডমিন অফিসিয়াল সূত্র যাচাই করলে এখানে দেখা যাবে।",
              "Entries show up here after an admin verifies them against official sources.",
            )}
          />
        ) : (
          <Card className="divide-y divide-navy-100">
            {verified.map((s) => (
              <Link key={s.id} href={`/services/${s.slug}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-navy-50">
                <span className="font-medium">{pick(s.title_bn, s.title_en)}</span>
                <span className="text-sm text-navy-600">{formatDate(s.last_verified_at, lang)}</span>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
