"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookmarkCheck, BookmarkPlus, ExternalLink, FileText, Info, ListOrdered, Wallet } from "lucide-react";
import { VerifiedBadge } from "@/components/service-card";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { FieldError } from "@/components/states";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { SavedService, ServiceDetail } from "@/lib/types";

export function ServiceView({ service }: { service: ServiceDetail }) {
  const { t, pick, lang } = useLang();
  const { user } = useAuth();
  const [savedId, setSavedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSavedId(null);
      return;
    }
    api<SavedService[]>("/api/users/saved-services")
      .then((list) => setSavedId(list.find((s) => s.service_id === service.id)?.id ?? null))
      .catch(() => {});
  }, [user, service.id]);

  const toggleSave = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (savedId) {
        await api(`/api/users/saved-services/${savedId}`, { method: "DELETE" });
        setSavedId(null);
      } else {
        const s = await api<SavedService>("/api/users/saved-services", { method: "POST", body: { service_id: service.id } });
        setSavedId(s.id);
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const eligibility = pick(service.eligibility_bn, service.eligibility_en);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-navy-600">
        <Link href="/services" className="hover:underline">{t("সেবাসমূহ", "Services")}</Link>
        <span className="mx-2">/</span>
        <Link href={`/categories/${service.category.slug}`} className="hover:underline">
          {pick(service.category.name_bn, service.category.name_en)}
        </Link>
      </nav>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge>{pick(service.category.name_bn, service.category.name_en)}</Badge>
          <VerifiedBadge date={service.last_verified_at} />
        </div>
        <h1 className="text-3xl font-bold leading-tight">{pick(service.title_bn, service.title_en)}</h1>
        <p className="mt-2 text-navy-700">{pick(service.summary_bn, service.summary_en)}</p>
        {service.authority_name && (
          <p className="mt-2 text-sm text-navy-600">
            {t("দায়িত্বপ্রাপ্ত কর্তৃপক্ষ:", "Responsible authority:")} <strong>{service.authority_name}</strong>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {service.official_url && (
            <Button asChild variant="brand">
              <a href={service.official_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden />
                {t("অফিসিয়াল ওয়েবসাইটে আবেদন", "Apply on official site")}
              </a>
            </Button>
          )}
          {user ? (
            <Button variant="outline" onClick={toggleSave} disabled={busy}>
              {savedId ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <BookmarkPlus className="h-4 w-4" aria-hidden />}
              {savedId ? t("সংরক্ষিত", "Saved") : t("সংরক্ষণ করুন", "Save")}
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">{t("সংরক্ষণ করতে লগইন করুন", "Log in to save")}</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href="/assistant">{t("AI সহকারীকে জিজ্ঞাসা করুন", "Ask the AI assistant")}</Link>
          </Button>
        </div>
        <div className="mt-3"><FieldError message={err} /></div>
      </header>

      {!service.last_verified_at && (
        <Card className="mb-6 flex gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="note">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            {t(
              "এই তথ্য এখনো আমাদের টিম যাচাই করেনি। আবেদনের আগে অবশ্যই অফিসিয়াল সূত্র দেখে নিন।",
              "This information has not been verified by our team yet. Please confirm with the official source before applying.",
            )}
          </p>
        </Card>
      )}

      <div className="space-y-6">
        {eligibility && (
          <Section icon={Info} title={t("যোগ্যতা", "Eligibility")}>
            <p className="whitespace-pre-line">{eligibility}</p>
          </Section>
        )}

        <Section icon={FileText} title={t("প্রয়োজনীয় কাগজপত্র", "Required documents")}>
          {service.documents.length === 0 ? (
            <Muted>{t("কাগজপত্রের তালিকা এখনো যোগ করা হয়নি।", "No document list has been added yet.")}</Muted>
          ) : (
            <ul className="space-y-2">
              {service.documents.map((d, i) => (
                <li key={d.id ?? i} className="flex flex-wrap items-baseline gap-2">
                  <span>• {pick(d.name_bn, d.name_en)}</span>
                  <Badge variant={d.is_required ? "default" : "warning"}>
                    {d.is_required ? t("আবশ্যক", "Required") : t("ঐচ্ছিক", "Optional")}
                  </Badge>
                  {pick(d.note_bn, d.note_en) && <span className="text-sm text-navy-600">— {pick(d.note_bn, d.note_en)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={ListOrdered} title={t("আবেদনের ধাপ", "Application steps")}>
          {service.steps.length === 0 ? (
            <Muted>{t("ধাপগুলো এখনো যোগ করা হয়নি।", "No steps have been added yet.")}</Muted>
          ) : (
            <ol className="space-y-4">
              {service.steps.map((s) => (
                <li key={s.id ?? s.step_number} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                    {s.step_number}
                  </span>
                  <div>
                    <p className="font-medium">{pick(s.title_bn, s.title_en)}</p>
                    {pick(s.description_bn, s.description_en) && (
                      <p className="text-sm text-navy-600">{pick(s.description_bn, s.description_en)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section icon={Wallet} title={t("সরকারি ফি", "Official fees")}>
          {service.fees.length === 0 ? (
            <Muted>{t("ফি সংক্রান্ত তথ্য এখনো যোগ করা হয়নি।", "No fee information has been added yet.")}</Muted>
          ) : (
            <ul className="space-y-2">
              {service.fees.map((f, i) => (
                <li key={f.id ?? i} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-navy-50 pb-2 last:border-0">
                  <span>
                    {pick(f.label_bn, f.label_en)}
                    {pick(f.note_bn, f.note_en) && <span className="block text-sm text-navy-600">{pick(f.note_bn, f.note_en)}</span>}
                  </span>
                  <strong>
                    {f.amount !== null
                      ? `${Number(f.amount).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")} ${f.currency === "BDT" ? "৳" : f.currency}`
                      : t("অফিসিয়াল সাইটে দেখুন", "See official site")}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={ExternalLink} title={t("তথ্যসূত্র", "Sources")}>
          {service.sources.length === 0 ? (
            <Muted>{t("কোনো সূত্র যোগ করা হয়নি।", "No sources have been added.")}</Muted>
          ) : (
            <ul className="space-y-2">
              {service.sources.map((s, i) => (
                <li key={s.id ?? i} className="flex flex-wrap items-center gap-2">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline-offset-2 hover:underline">
                    {s.title}
                  </a>
                  {s.is_official && <Badge>{t("অফিসিয়াল", "Official")}</Badge>}
                  <span className="text-sm text-navy-600">
                    {s.verified_at
                      ? `${t("যাচাই:", "Verified:")} ${formatDate(s.verified_at, lang)}`
                      : t("যাচাই হয়নি", "Not verified yet")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-brand-600" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-navy-500">{children}</p>;
}
