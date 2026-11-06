"use client";

import { useState } from "react";
import { BarChart3, FileText, FolderTree, ScrollText, Users } from "lucide-react";
import { ErrorState, FieldError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, Select, Skeleton } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { useFetch } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import type { AdminLog, Analytics, Category, Page, ServiceListItem, User } from "@/lib/types";
import { ServiceEditor } from "./service-editor";

type Tab = "analytics" | "services" | "categories" | "users" | "logs";

export default function AdminPage() {
  const { t } = useLang();
  const { allowed } = useRequireAuth({ admin: true });
  const [tab, setTab] = useState<Tab>("analytics");

  if (!allowed) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Skeleton className="h-64" />
      </div>
    );
  }

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "analytics", icon: BarChart3, label: t("অ্যানালিটিক্স", "Analytics") },
    { id: "services", icon: FileText, label: t("সেবা", "Services") },
    { id: "categories", icon: FolderTree, label: t("ক্যাটাগরি", "Categories") },
    { id: "users", icon: Users, label: t("ব্যবহারকারী", "Users") },
    { id: "logs", icon: ScrollText, label: t("অ্যাক্টিভিটি লগ", "Activity log") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("অ্যাডমিন ড্যাশবোর্ড", "Admin dashboard")}</h1>
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
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "services" && <ServicesTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "users" && <UsersTab />}
        {tab === "logs" && <LogsTab />}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { t, pick } = useLang();
  const { data, loading, error, reload } = useFetch<Analytics>("/api/admin/analytics");
  if (loading) return <Skeleton className="h-40" />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;
  const stats = [
    [t("মোট ব্যবহারকারী", "Users"), data.users],
    [t("গত ৭ দিনে নতুন", "New (7 days)"), data.new_users_7d],
    [t("সেবা (প্রকাশিত)", "Services (published)"), `${data.services} (${data.published_services})`],
    [t("যাচাইকৃত সেবা", "Verified services"), data.verified_services],
    [t("যাচাই বাকি", "Awaiting verification"), data.unverified_services],
    [t("আবেদন রেকর্ড", "Application records"), data.applications],
    [t("AI চ্যাট সেশন", "AI chat sessions"), data.chat_sessions],
    [t("উত্তর দিতে না পারা প্রশ্ন", "Unanswered questions"), data.unanswered_questions],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-sm text-navy-600">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="mb-2 font-semibold">{t("সবচেয়ে বেশি সংরক্ষিত সেবা", "Most saved services")}</h2>
        {data.top_saved_services.length === 0 ? (
          <p className="text-sm text-navy-600">{t("এখনো কোনো ডাটা নেই।", "No data yet.")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.top_saved_services.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{pick(s.title_bn, s.title_en)}</span>
                <strong>{s.saves}</strong>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ServicesTab() {
  const { t, pick, lang } = useLang();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch<Page<ServiceListItem>>(`/api/admin/services?page=${page}&page_size=15`);
  const [editing, setEditing] = useState<number | "new" | null>(null);

  if (editing !== null) {
    return (
      <ServiceEditor
        serviceId={editing === "new" ? null : editing}
        onClose={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-navy-600">
          {t(
            "সেবা সম্পাদনা করলে যাচাই বাতিল হয়; অফিসিয়াল সূত্র মিলিয়ে আবার ‘যাচাই করুন’ চাপুন।",
            "Editing a service clears its verification; re-check official sources and press Verify again.",
          )}
        </p>
        <Button variant="brand" onClick={() => setEditing("new")}>{t("নতুন সেবা", "New service")}</Button>
      </div>
      {loading ? <Skeleton className="h-48" /> : error || !data ? <ErrorState message={error} onRetry={reload} /> : (
        <Card className="divide-y divide-navy-100">
          {data.items.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium">{pick(s.title_bn, s.title_en)}</p>
                <p className="text-xs text-navy-500">{s.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.last_verified_at ? <Badge variant="success">{formatDate(s.last_verified_at, lang)}</Badge> : <Badge variant="warning">{t("যাচাই বাকি", "Unverified")}</Badge>}
                <Button variant="outline" size="sm" onClick={() => setEditing(s.id)}>{t("সম্পাদনা", "Edit")}</Button>
              </div>
            </div>
          ))}
          {data.items.length === 0 && <p className="p-6 text-center text-sm text-navy-600">{t("কোনো সেবা নেই", "No services")}</p>}
        </Card>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("আগের", "Previous")}</Button>
          <span className="text-sm">{page} / {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>{t("পরের", "Next")}</Button>
        </div>
      )}
    </div>
  );
}

const emptyCat = { slug: "", name_bn: "", name_en: "", description_bn: "", description_en: "", icon: "", sort_order: 0 };

function CategoriesTab() {
  const { t, pick } = useLang();
  const { data, loading, error, reload } = useFetch<Category[]>("/api/categories");
  const [form, setForm] = useState<typeof emptyCat & { id?: number }>(emptyCat);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const { id, ...body } = form;
    const payload = { ...body, icon: body.icon || null, description_bn: body.description_bn || null, description_en: body.description_en || null };
    try {
      if (id) await api(`/api/admin/categories/${id}`, { method: "PUT", body: payload });
      else await api("/api/admin/categories", { method: "POST", body: payload });
      setForm(emptyCat);
      reload();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Error");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(t("ক্যাটাগরি মুছবেন?", "Delete this category?"))) return;
    try {
      await api(`/api/admin/categories/${id}`, { method: "DELETE" });
      reload();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Error");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        {loading ? <Skeleton className="h-40" /> : error ? <ErrorState message={error} onRetry={reload} /> : (
          <Card className="divide-y divide-navy-100">
            {data?.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium">{pick(c.name_bn, c.name_en)}</p>
                  <p className="text-xs text-navy-500">{c.slug} · #{c.sort_order}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setForm({ ...c, description_bn: c.description_bn ?? "", description_en: c.description_en ?? "", icon: c.icon ?? "" })}>{t("সম্পাদনা", "Edit")}</Button>
                  <Button variant="outline" size="sm" onClick={() => remove(c.id)}>{t("মুছুন", "Delete")}</Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
      <Card className="h-fit p-4">
        <h2 className="mb-3 font-semibold">{form.id ? t("ক্যাটাগরি সম্পাদনা", "Edit category") : t("নতুন ক্যাটাগরি", "New category")}</h2>
        <form onSubmit={save} className="space-y-3">
          <div><Label htmlFor="c-slug">Slug</Label><Input id="c-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><Label htmlFor="c-bn">{t("নাম (বাংলা)", "Name (Bangla)")}</Label><Input id="c-bn" required value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} /></div>
          <div><Label htmlFor="c-en">{t("নাম (ইংরেজি)", "Name (English)")}</Label><Input id="c-en" required value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
          <div><Label htmlFor="c-icon">{t("আইকন (id-card, plane, car, landmark, map, shield)", "Icon (id-card, plane, car, landmark, map, shield)")}</Label><Input id="c-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
          <div><Label htmlFor="c-order">{t("ক্রম", "Order")}</Label><Input id="c-order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          <FieldError message={err} />
          <div className="flex gap-2">
            <Button type="submit" variant="brand">{t("সংরক্ষণ", "Save")}</Button>
            {form.id && <Button type="button" variant="ghost" onClick={() => setForm(emptyCat)}>{t("বাতিল", "Cancel")}</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { t, lang } = useLang();
  const { user: me } = useRequireAuth({ admin: true });
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch<Page<User>>(`/api/admin/users?page=${page}&page_size=20`);
  const [err, setErr] = useState<string | null>(null);

  const update = async (id: number, body: { is_active?: boolean; role?: string }) => {
    setErr(null);
    try {
      await api(`/api/admin/users/${id}`, { method: "PUT", body });
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Error");
    }
  };

  if (loading) return <Skeleton className="h-48" />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="space-y-3">
      <FieldError message={err} />
      <Card className="divide-y divide-navy-100">
        {data.items.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{u.full_name}</p>
              <p className="text-xs text-navy-500">{u.email} · {formatDate(u.created_at, lang)}</p>
            </div>
            <div className="flex items-center gap-2">
              {!u.is_active && <Badge variant="danger">{t("নিষ্ক্রিয়", "Disabled")}</Badge>}
              <Select
                aria-label="Role"
                className="h-8 w-28"
                value={u.role_name}
                disabled={u.id === me?.id}
                onChange={(e) => update(u.id, { role: e.target.value })}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </Select>
              <Button variant="outline" size="sm" disabled={u.id === me?.id} onClick={() => update(u.id, { is_active: !u.is_active })}>
                {u.is_active ? t("নিষ্ক্রিয় করুন", "Disable") : t("সক্রিয় করুন", "Enable")}
              </Button>
            </div>
          </div>
        ))}
      </Card>
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("আগের", "Previous")}</Button>
          <span className="text-sm">{page} / {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>{t("পরের", "Next")}</Button>
        </div>
      )}
    </div>
  );
}

function LogsTab() {
  const { t, lang } = useLang();
  const { data, loading, error, reload } = useFetch<Page<AdminLog>>("/api/admin/logs?page_size=50");
  if (loading) return <Skeleton className="h-48" />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;
  return (
    <Card className="divide-y divide-navy-100">
      {data.items.length === 0 && <p className="p-6 text-center text-sm text-navy-600">{t("কোনো লগ নেই", "No log entries")}</p>}
      {data.items.map((l) => (
        <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
          <span>
            <Badge>{l.action}</Badge>{" "}
            {l.entity_type && <span className="text-navy-600">{l.entity_type} #{l.entity_id}</span>}
          </span>
          <span className="text-xs text-navy-500">
            {t("অ্যাডমিন", "admin")} #{l.admin_id} · {formatDate(l.created_at, lang)}
          </span>
        </div>
      ))}
    </Card>
  );
}
