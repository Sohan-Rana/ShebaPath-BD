"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, ClipboardList, LayoutDashboard, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { ServiceCard } from "@/components/service-card";
import { CardGridSkeleton, EmptyState, ErrorState, FieldError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { useFetch } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import type { Application, Page, SavedService } from "@/lib/types";

type Tab = "overview" | "saved" | "applications" | "profile";

export default function DashboardPage() {
  const { t } = useLang();
  const { allowed, user } = useRequireAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (!allowed || !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "overview", icon: LayoutDashboard, label: t("ওভারভিউ", "Overview") },
    { id: "saved", icon: Bookmark, label: t("সংরক্ষিত সেবা", "Saved services") },
    { id: "applications", icon: ClipboardList, label: t("আমার আবেদন", "My applications") },
    { id: "profile", icon: UserCog, label: t("প্রোফাইল", "Profile") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        {t("স্বাগতম,", "Welcome,")} {user.full_name}
      </h1>
      <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto border-b border-navy-100">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === x.id ? "border-brand-600 text-navy-900" : "border-transparent text-navy-600 hover:text-navy-900",
            )}
          >
            <x.icon className="h-4 w-4" aria-hidden />
            {x.label}
          </button>
        ))}
      </div>
      <div className="mt-6" role="tabpanel">
        {tab === "overview" && <Overview goto={setTab} />}
        {tab === "saved" && <Saved />}
        {tab === "applications" && <Applications />}
        {tab === "profile" && <Profile />}
      </div>
    </div>
  );
}

function Overview({ goto }: { goto: (t: Tab) => void }) {
  const { t, lang } = useLang();
  const saved = useFetch<SavedService[]>("/api/users/saved-services");
  const apps = useFetch<Page<Application>>("/api/applications?page_size=5");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("সাম্প্রতিক আবেদন", "Recent applications")}</h2>
          <Button variant="link" size="sm" onClick={() => goto("applications")}>{t("সব দেখুন", "View all")}</Button>
        </div>
        {apps.loading ? <Skeleton className="mt-3 h-20" /> : !apps.data?.items.length ? (
          <p className="mt-3 text-sm text-navy-600">{t("এখনো কোনো আবেদন যোগ করা হয়নি।", "No applications added yet.")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {apps.data.items.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.service_name}</span>
                <span className="flex items-center gap-2">
                  <Badge>{a.status}</Badge>
                  <span className="text-navy-500">{formatDate(a.updated_at, lang)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("সংরক্ষিত সেবা", "Saved services")}</h2>
          <Button variant="link" size="sm" onClick={() => goto("saved")}>{t("সব দেখুন", "View all")}</Button>
        </div>
        {saved.loading ? <Skeleton className="mt-3 h-20" /> : !saved.data?.length ? (
          <p className="mt-3 text-sm text-navy-600">
            {t("কোনো সেবা সংরক্ষণ করা হয়নি।", "No saved services.")}{" "}
            <Link href="/services" className="text-brand-700 hover:underline">{t("সেবা খুঁজুন", "Browse services")}</Link>
          </p>
        ) : (
          <p className="mt-3 text-sm text-navy-700">{t(`${saved.data.length}টি সেবা সংরক্ষিত`, `${saved.data.length} saved`)}</p>
        )}
      </Card>
    </div>
  );
}

function Saved() {
  const { t } = useLang();
  const { data, loading, error, reload } = useFetch<SavedService[]>("/api/users/saved-services");
  const [err, setErr] = useState<string | null>(null);

  const remove = async (id: number) => {
    setErr(null);
    try {
      await api(`/api/users/saved-services/${id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Error");
    }
  };

  if (loading) return <CardGridSkeleton count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.length)
    return (
      <EmptyState
        title={t("কোনো সেবা সংরক্ষণ করা হয়নি", "No saved services")}
        hint={t("সেবার পেজে গিয়ে ‘সংরক্ষণ করুন’ চাপুন।", "Open a service and press Save.")}
        action={<Button asChild variant="brand" size="sm"><Link href="/services">{t("সেবা খুঁজুন", "Browse services")}</Link></Button>}
      />
    );
  return (
    <>
      <FieldError message={err} />
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((s) => (
          <div key={s.id} className="space-y-2">
            <ServiceCard service={s.service} />
            <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
              <Trash2 className="h-4 w-4" aria-hidden /> {t("সরান", "Remove")}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}

const STATUSES = ["submitted", "in review", "action needed", "approved", "rejected", "completed"];

function Applications() {
  const { t, lang } = useLang();
  const { data, loading, error, reload } = useFetch<Page<Application>>("/api/applications?page_size=100");
  const [editing, setEditing] = useState<Application | "new" | null>(null);

  const remove = async (id: number) => {
    if (!window.confirm(t("এই রেকর্ড মুছে ফেলবেন?", "Delete this record?"))) return;
    await api(`/api/applications/${id}`, { method: "DELETE" }).catch(() => {});
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-navy-600">
          {t(
            "এটি আপনার নিজের রেকর্ড। সরকারি সিস্টেম থেকে স্বয়ংক্রিয়ভাবে স্ট্যাটাস আপডেট হয় না।",
            "This is your own record. Status is not updated automatically from any government system.",
          )}
        </p>
        <Button variant="brand" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden /> {t("আবেদন যোগ করুন", "Add application")}
        </Button>
      </div>

      {editing && (
        <ApplicationForm
          app={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? <Skeleton className="h-40" /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? (
        <EmptyState title={t("কোনো আবেদন রেকর্ড নেই", "No application records")} />
      ) : (
        <div className="grid gap-3">
          {data.items.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="space-y-1">
                <p className="font-semibold">{a.service_name}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-navy-600">
                  <Badge>{a.status}</Badge>
                  {a.reference_number && <span>{t("রেফ:", "Ref:")} {a.reference_number}</span>}
                  {a.submitted_on && <span>{t("জমা:", "Submitted:")} {formatDate(a.submitted_on, lang)}</span>}
                  {a.expected_completion && <span>{t("প্রত্যাশিত:", "Expected:")} {formatDate(a.expected_completion, lang)}</span>}
                </div>
                {a.notes && <p className="text-sm text-navy-700">{a.notes}</p>}
                {a.reminder_at && <p className="text-xs text-amber-700">⏰ {formatDate(a.reminder_at, lang)}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setEditing(a)} aria-label={t("সম্পাদনা", "Edit")}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(a.id)} aria-label={t("মুছুন", "Delete")}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationForm({ app, onDone, onCancel }: { app: Application | null; onDone: () => void; onCancel: () => void }) {
  const { t } = useLang();
  const [f, setF] = useState({
    service_name: app?.service_name ?? "",
    reference_number: app?.reference_number ?? "",
    submitted_on: app?.submitted_on ?? "",
    expected_completion: app?.expected_completion ?? "",
    status: app?.status ?? "submitted",
    notes: app?.notes ?? "",
    reminder_at: app?.reminder_at ? app.reminder_at.slice(0, 10) : "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = {
      service_name: f.service_name,
      reference_number: f.reference_number || null,
      submitted_on: f.submitted_on || null,
      expected_completion: f.expected_completion || null,
      status: f.status,
      notes: f.notes || null,
      reminder_at: f.reminder_at ? new Date(f.reminder_at).toISOString() : null,
    };
    try {
      if (app) await api(`/api/applications/${app.id}`, { method: "PUT", body });
      else await api("/api/applications", { method: "POST", body });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="a-name">{t("সেবার নাম", "Service name")}</Label>
          <Input id="a-name" required value={f.service_name} onChange={set("service_name")} />
        </div>
        <div>
          <Label htmlFor="a-ref">{t("রেফারেন্স নম্বর", "Reference number")}</Label>
          <Input id="a-ref" value={f.reference_number} onChange={set("reference_number")} />
        </div>
        <div>
          <Label htmlFor="a-status">{t("স্ট্যাটাস (আপনার নিজের)", "Status (your own)")}</Label>
          <Select id="a-status" value={f.status} onChange={set("status")}>
            {[...new Set([...STATUSES, f.status])].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="a-sub">{t("জমার তারিখ", "Submission date")}</Label>
          <Input id="a-sub" type="date" value={f.submitted_on} onChange={set("submitted_on")} />
        </div>
        <div>
          <Label htmlFor="a-exp">{t("প্রত্যাশিত সমাপ্তি", "Expected completion")}</Label>
          <Input id="a-exp" type="date" value={f.expected_completion} onChange={set("expected_completion")} />
        </div>
        <div>
          <Label htmlFor="a-rem">{t("রিমাইন্ডার তারিখ", "Reminder date")}</Label>
          <Input id="a-rem" type="date" value={f.reminder_at} onChange={set("reminder_at")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="a-notes">{t("নোট", "Notes")}</Label>
          <Textarea id="a-notes" value={f.notes} onChange={set("notes")} />
        </div>
        <div className="sm:col-span-2"><FieldError message={err} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" variant="brand" disabled={busy}>{t("সংরক্ষণ", "Save")}</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>{t("বাতিল", "Cancel")}</Button>
        </div>
      </form>
    </Card>
  );
}

function Profile() {
  const { t } = useLang();
  const { user, refresh } = useRequireAuth();
  const [f, setF] = useState({
    full_name: user?.full_name ?? "",
    phone: user?.phone ?? "",
    preferred_language: user?.preferred_language ?? "bn",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      await api("/api/users/me", { method: "PUT", body: { ...f, phone: f.phone || null } });
      await refresh();
      setMsg(t("প্রোফাইল আপডেট হয়েছে", "Profile updated"));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Error");
    }
  };

  return (
    <Card className="max-w-lg p-5">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="p-email">{t("ইমেইল", "Email")}</Label>
          <Input id="p-email" value={user?.email ?? ""} disabled />
        </div>
        <div>
          <Label htmlFor="p-name">{t("পূর্ণ নাম", "Full name")}</Label>
          <Input id="p-name" required minLength={2} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="p-phone">{t("মোবাইল", "Phone")}</Label>
          <Input id="p-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="p-lang">{t("পছন্দের ভাষা", "Preferred language")}</Label>
          <Select id="p-lang" value={f.preferred_language} onChange={(e) => setF({ ...f, preferred_language: e.target.value as "bn" | "en" })}>
            <option value="bn">বাংলা</option>
            <option value="en">English</option>
          </Select>
        </div>
        <FieldError message={err} />
        {msg && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}
        <Button type="submit" variant="brand">{t("সংরক্ষণ", "Save")}</Button>
      </form>
    </Card>
  );
}
