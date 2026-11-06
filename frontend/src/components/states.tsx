"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useLang } from "@/lib/i18n";

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-navy-300" aria-hidden />
      <p className="font-semibold text-navy-900">{title}</p>
      {hint && <p className="max-w-md text-sm text-navy-600">{hint}</p>}
      {action}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  const { t } = useLang();
  return (
    <Card role="alert" className="flex flex-col items-center gap-2 border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="h-9 w-9 text-red-500" aria-hidden />
      <p className="font-semibold text-red-800">{t("কিছু একটা সমস্যা হয়েছে", "Something went wrong")}</p>
      {message && <p className="text-sm text-red-700">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("আবার চেষ্টা করুন", "Try again")}
        </Button>
      )}
    </Card>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
