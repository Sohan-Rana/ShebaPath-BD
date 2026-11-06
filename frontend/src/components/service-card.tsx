"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Star } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { useLang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { ServiceListItem } from "@/lib/types";

export function VerifiedBadge({ date }: { date: string | null }) {
  const { t, lang } = useLang();
  if (!date) {
    return <Badge variant="warning">{t("যাচাই অপেক্ষমাণ", "Verification pending")}</Badge>;
  }
  return (
    <Badge variant="success">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      {t("যাচাইকৃত", "Verified")} · {formatDate(date, lang)}
    </Badge>
  );
}

export function ServiceCard({ service }: { service: ServiceListItem }) {
  const { pick, t } = useLang();
  return (
    <Link href={`/services/${service.slug}`} className="group block h-full rounded-2xl">
      <Card className="flex h-full flex-col gap-3 p-5 transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <Badge>{pick(service.category.name_bn, service.category.name_en)}</Badge>
          {service.is_popular && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden />
              {t("জনপ্রিয়", "Popular")}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold leading-snug text-navy-900">{pick(service.title_bn, service.title_en)}</h3>
        <p className="line-clamp-2 text-sm text-navy-600">{pick(service.summary_bn, service.summary_en)}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <VerifiedBadge date={service.last_verified_at} />
          <ArrowRight className="h-4 w-4 text-navy-400 transition-transform group-hover:translate-x-1" aria-hidden />
        </div>
      </Card>
    </Link>
  );
}
