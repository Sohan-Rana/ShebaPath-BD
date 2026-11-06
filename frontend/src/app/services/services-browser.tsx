"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchBox } from "@/components/search-box";
import { ServiceCard } from "@/components/service-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Category, Page, ServiceListItem } from "@/lib/types";

export function ServicesBrowser() {
  const { t, pick } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const qs = new URLSearchParams({ page: String(page), page_size: "12" });
  if (q) qs.set("q", q);
  if (category) qs.set("category", category);

  const cats = useFetch<Category[]>("/api/categories");
  const services = useFetch<Page<ServiceListItem>>(`/api/services?${qs.toString()}`);

  const go = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`/services?${sp.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("সরকারি সেবাসমূহ", "Government services")}</h1>
      <p className="mt-1 text-navy-600">
        {t("সেবা খুঁজুন বা ক্যাটাগরি অনুযায়ী ফিল্টার করুন।", "Search for a service or filter by category.")}
      </p>

      <div className="mt-6 max-w-2xl" key={q}>
        <SearchBox initial={q} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t("ক্যাটাগরি ফিল্টার", "Category filter")}>
        <button
          onClick={() => go({ category: null, page: null })}
          aria-pressed={!category}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium",
            !category ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white hover:bg-navy-50",
          )}
        >
          {t("সব", "All")}
        </button>
        {cats.data?.map((c) => (
          <button
            key={c.id}
            onClick={() => go({ category: c.slug, page: null })}
            aria-pressed={category === c.slug}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium",
              category === c.slug ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white hover:bg-navy-50",
            )}
          >
            {pick(c.name_bn, c.name_en)}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {services.loading ? (
          <CardGridSkeleton />
        ) : services.error ? (
          <ErrorState message={services.error} onRetry={services.reload} />
        ) : !services.data?.items.length ? (
          <EmptyState
            title={t("কোনো সেবা পাওয়া যায়নি", "No services found")}
            hint={t("অন্য শব্দ দিয়ে খুঁজুন বা ফিল্টার সরিয়ে দিন।", "Try different keywords or clear the filter.")}
            action={
              (q || category) && (
                <Button variant="outline" size="sm" onClick={() => router.push("/services")}>
                  {t("ফিল্টার মুছুন", "Clear filters")}
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-navy-600" aria-live="polite">
              {t(`মোট ${services.data.total}টি সেবা`, `${services.data.total} services`)}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.data.items.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
            {services.data.pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}>
                  {t("আগের", "Previous")}
                </Button>
                <span className="text-sm">
                  {page} / {services.data.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= services.data.pages}
                  onClick={() => go({ page: String(page + 1) })}
                >
                  {t("পরের", "Next")}
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
