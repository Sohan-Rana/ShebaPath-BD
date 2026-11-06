"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Plus, Trash2 } from "lucide-react";
import { ErrorState, FieldError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { Category, ServiceDetail, ServiceDocument, ServiceFee, ServiceSource, ServiceStep } from "@/lib/types";

type Form = Omit<ServiceDetail, "id" | "category" | "last_verified_at"> & { category_id: number };

const blank: Form = {
  slug: "", category_id: 0, title_bn: "", title_en: "", summary_bn: "", summary_en: "",
  eligibility_bn: "", eligibility_en: "", authority_name: "", official_url: "",
  is_popular: false, is_published: true, documents: [], steps: [], fees: [], sources: [],
};

export function ServiceEditor({ serviceId, onClose }: { serviceId: number | null; onClose: () => void }) {
  const { t, lang } = useLang();
  const cats = useFetch<Category[]>("/api/categories");
  const existing = useFetch<ServiceDetail>(serviceId ? `/api/admin/services/${serviceId}` : null);
  const [f, setF] = useState<Form>(blank);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [id, setId] = useState<number | null>(serviceId);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (s: ServiceDetail) => {
    const { id: _i, category: _c, last_verified_at, ...rest } = s;
    setF({ ...blank, ...rest, category_id: s.category.id });
    setVerifiedAt(last_verified_at);
  };

  useEffect(() => {
    if (existing.data) load(existing.data);
  }, [existing.data]);

  useEffect(() => {
    if (!serviceId && cats.data?.length && !f.category_id) setF((p) => ({ ...p, category_id: cats.data![0].id }));
  }, [cats.data, serviceId, f.category_id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never);

  const clean = () => ({
    ...f,
    summary_bn: f.summary_bn || null, summary_en: f.summary_en || null,
    eligibility_bn: f.eligibility_bn || null, eligibility_en: f.eligibility_en || null,
    authority_name: f.authority_name || null, official_url: f.official_url || null,
    documents: f.documents.map(({ id: _d, ...d }) => d),
    steps: f.steps.map(({ id: _s, ...s }, i) => ({ ...s, step_number: i + 1 })),
    fees: f.fees.map(({ id: _x, ...x }) => ({ ...x, amount: x.amount === "" || x.amount === null ? null : x.amount })),
    sources: f.sources.map(({ id: _y, verified_at: _v, ...y }) => y),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const saved = id
        ? await api<ServiceDetail>(`/api/admin/services/${id}`, { method: "PUT", body: clean() })
        : await api<ServiceDetail>("/api/admin/services", { method: "POST", body: clean() });
      setId(saved.id);
      load(saved);
      setMsg(t("সংরক্ষিত হয়েছে। এখন অফিসিয়াল সূত্র মিলিয়ে ‘যাচাই করুন’ চাপুন।", "Saved. Now check the official sources and press Verify."));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!id) return;
    setErr(null);
    setMsg(null);
    try {
      const s = await api<ServiceDetail>("/api/admin/sources/verify", { method: "POST", body: { service_id: id } });
      load(s);
      setMsg(t("যাচাই সম্পন্ন; AI জ্ঞানভান্ডার হালনাগাদ হয়েছে।", "Verified; AI knowledge base updated."));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Error");
    }
  };

  const remove = async () => {
    if (!id || !window.confirm(t("এই সেবা স্থায়ীভাবে মুছবেন?", "Delete this service permanently?"))) return;
    try {
      await api(`/api/admin/services/${id}`, { method: "DELETE" });
      onClose();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Error");
    }
  };

  if (serviceId && existing.loading) return <Skeleton className="h-96" />;
  if (serviceId && existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>← {t("তালিকায় ফিরুন", "Back to list")}</Button>
        <div className="flex items-center gap-2">
          {verifiedAt ? <Badge variant="success">{t("যাচাইকৃত", "Verified")} · {formatDate(verifiedAt, lang)}</Badge> : <Badge variant="warning">{t("যাচাই বাকি", "Unverified")}</Badge>}
          {id && <Button type="button" variant="brand" onClick={verify}><BadgeCheck className="h-4 w-4" aria-hidden />{t("যাচাই করুন", "Verify")}</Button>}
          {id && <Button type="button" variant="destructive" onClick={remove}>{t("মুছুন", "Delete")}</Button>}
        </div>
      </div>

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <div><Label htmlFor="s-slug">Slug</Label><Input id="s-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={f.slug} onChange={text("slug")} /></div>
        <div>
          <Label htmlFor="s-cat">{t("ক্যাটাগরি", "Category")}</Label>
          <Select id="s-cat" value={f.category_id} onChange={(e) => set("category_id", Number(e.target.value))}>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name_en} / {c.name_bn}</option>)}
          </Select>
        </div>
        <div><Label htmlFor="s-tbn">{t("শিরোনাম (বাংলা)", "Title (Bangla)")}</Label><Input id="s-tbn" required value={f.title_bn} onChange={text("title_bn")} /></div>
        <div><Label htmlFor="s-ten">{t("শিরোনাম (ইংরেজি)", "Title (English)")}</Label><Input id="s-ten" required value={f.title_en} onChange={text("title_en")} /></div>
        <div><Label htmlFor="s-sbn">{t("সারসংক্ষেপ (বাংলা)", "Summary (Bangla)")}</Label><Textarea id="s-sbn" value={f.summary_bn ?? ""} onChange={text("summary_bn")} /></div>
        <div><Label htmlFor="s-sen">{t("সারসংক্ষেপ (ইংরেজি)", "Summary (English)")}</Label><Textarea id="s-sen" value={f.summary_en ?? ""} onChange={text("summary_en")} /></div>
        <div><Label htmlFor="s-ebn">{t("যোগ্যতা (বাংলা)", "Eligibility (Bangla)")}</Label><Textarea id="s-ebn" value={f.eligibility_bn ?? ""} onChange={text("eligibility_bn")} /></div>
        <div><Label htmlFor="s-een">{t("যোগ্যতা (ইংরেজি)", "Eligibility (English)")}</Label><Textarea id="s-een" value={f.eligibility_en ?? ""} onChange={text("eligibility_en")} /></div>
        <div><Label htmlFor="s-auth">{t("কর্তৃপক্ষ", "Authority")}</Label><Input id="s-auth" value={f.authority_name ?? ""} onChange={text("authority_name")} /></div>
        <div><Label htmlFor="s-url">{t("অফিসিয়াল আবেদন লিংক", "Official application link")}</Label><Input id="s-url" type="url" value={f.official_url ?? ""} onChange={text("official_url")} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_popular} onChange={(e) => set("is_popular", e.target.checked)} /> {t("জনপ্রিয়", "Popular")}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_published} onChange={(e) => set("is_published", e.target.checked)} /> {t("প্রকাশিত", "Published")}</label>
      </Card>

      <ListEditor<ServiceDocument>
        title={t("প্রয়োজনীয় কাগজপত্র", "Required documents")}
        items={f.documents}
        onChange={(v) => set("documents", v)}
        blank={() => ({ name_bn: "", name_en: "", is_required: true, sort_order: f.documents.length })}
        render={(d, up) => (
          <div className="grid flex-1 gap-2 md:grid-cols-3">
            <Input aria-label="Name BN" placeholder="নাম (বাংলা)" required value={d.name_bn} onChange={(e) => up({ name_bn: e.target.value })} />
            <Input aria-label="Name EN" placeholder="Name (English)" required value={d.name_en} onChange={(e) => up({ name_en: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.is_required} onChange={(e) => up({ is_required: e.target.checked })} />{t("আবশ্যক", "Required")}</label>
          </div>
        )}
      />

      <ListEditor<ServiceStep>
        title={t("আবেদনের ধাপ", "Application steps")}
        items={f.steps}
        onChange={(v) => set("steps", v)}
        blank={() => ({ step_number: f.steps.length + 1, title_bn: "", title_en: "" })}
        render={(s, up) => (
          <div className="grid flex-1 gap-2 md:grid-cols-2">
            <Input aria-label="Step title BN" placeholder="ধাপ (বাংলা)" required value={s.title_bn} onChange={(e) => up({ title_bn: e.target.value })} />
            <Input aria-label="Step title EN" placeholder="Step (English)" required value={s.title_en} onChange={(e) => up({ title_en: e.target.value })} />
            <Input aria-label="Step desc BN" placeholder="বিবরণ (বাংলা)" value={s.description_bn ?? ""} onChange={(e) => up({ description_bn: e.target.value })} />
            <Input aria-label="Step desc EN" placeholder="Description (English)" value={s.description_en ?? ""} onChange={(e) => up({ description_en: e.target.value })} />
          </div>
        )}
      />

      <ListEditor<ServiceFee>
        title={t("সরকারি ফি", "Official fees")}
        items={f.fees}
        onChange={(v) => set("fees", v)}
        blank={() => ({ label_bn: "", label_en: "", amount: "", currency: "BDT" })}
        render={(x, up) => (
          <div className="grid flex-1 gap-2 md:grid-cols-4">
            <Input aria-label="Fee label BN" placeholder="বিবরণ (বাংলা)" required value={x.label_bn} onChange={(e) => up({ label_bn: e.target.value })} />
            <Input aria-label="Fee label EN" placeholder="Label (English)" required value={x.label_en} onChange={(e) => up({ label_en: e.target.value })} />
            <Input aria-label="Amount" type="number" min="0" step="0.01" placeholder={t("পরিমাণ (খালি = সাইটে দেখুন)", "Amount (empty = see site)")} value={x.amount ?? ""} onChange={(e) => up({ amount: e.target.value })} />
            <Input aria-label="Currency" value={x.currency} onChange={(e) => up({ currency: e.target.value })} />
          </div>
        )}
      />

      <ListEditor<ServiceSource>
        title={t("অফিসিয়াল সূত্র", "Official sources")}
        items={f.sources}
        onChange={(v) => set("sources", v)}
        blank={() => ({ title: "", url: "", is_official: true })}
        render={(s, up) => (
          <div className="grid flex-1 gap-2 md:grid-cols-3">
            <Input aria-label="Source title" placeholder={t("শিরোনাম", "Title")} required value={s.title} onChange={(e) => up({ title: e.target.value })} />
            <Input aria-label="Source URL" type="url" placeholder="https://…" required value={s.url} onChange={(e) => up({ url: e.target.value })} />
            <span className="self-center text-xs text-navy-500">{s.verified_at ? `${t("যাচাই:", "Verified:")} ${formatDate(s.verified_at, lang)}` : t("যাচাই হয়নি", "Not verified")}</span>
          </div>
        )}
      />

      <FieldError message={err} />
      {msg && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}
      <Button type="submit" variant="brand" size="lg" disabled={busy}>{busy ? t("সংরক্ষণ হচ্ছে…", "Saving…") : t("সংরক্ষণ করুন", "Save service")}</Button>
    </form>
  );
}

function ListEditor<T>({
  title, items, onChange, blank, render,
}: {
  title: string;
  items: T[];
  onChange: (v: T[]) => void;
  blank: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, blank()])}>
          <Plus className="h-4 w-4" aria-hidden /> {t("যোগ করুন", "Add")}
        </Button>
      </div>
      {items.length === 0 && <p className="text-sm text-navy-500">{t("কিছু যোগ করা হয়নি।", "Nothing added.")}</p>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
