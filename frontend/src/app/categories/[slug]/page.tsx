"use client";

import Link from "next/link";
import { use } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { ServiceCard } from "@/components/service-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/states";
import { useFetch } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import type { Category, Page, ServiceListItem } from "@/lib/types";

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t, pick } = useLang();
  const cats = useFetch<Category[]>("/api/categories");
  const services = useFetch<Page<ServiceListItem>>(`/api/services?category=${encodeURIComponent(slug)}&page_size=50`);
  const category = cats.data?.find((c) => c.slug === slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-navy-600">
        <Link href="/services" className="hover:underline">{t("সেবাসমূহ", "Services")}</Link>
        <span className="mx-2">/</span>
        <span>{category ? pick(category.name_bn, category.name_en) : slug}</span>
      </nav>

      {cats.data && !category ? (
        <EmptyState
          title={t("ক্যাটাগরি পাওয়া যায়নি", "Category not found")}
          action={<Link className="text-brand-700 underline" href="/services">{t("সব সেবা দেখুন", "Browse all services")}</Link>}
        />
      ) : (
        <>
          <header className="mb-8 flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-900 text-white">
              <CategoryIcon name={category?.icon} className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-3xl font-bold">{category ? pick(category.name_bn, category.name_en) : "…"}</h1>
              {category && pick(category.description_bn, category.description_en) && (
                <p className="text-navy-600">{pick(category.description_bn, category.description_en)}</p>
              )}
            </div>
          </header>

          {services.loading ? (
            <CardGridSkeleton />
          ) : services.error ? (
            <ErrorState message={services.error} onRetry={services.reload} />
          ) : !services.data?.items.length ? (
            <EmptyState title={t("এই ক্যাটাগরিতে এখনো কোনো সেবা নেই", "No services in this category yet")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.data.items.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
