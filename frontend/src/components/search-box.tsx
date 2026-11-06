"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import type { Page, ServiceListItem } from "@/lib/types";

export function SearchBox({ initial = "", large = false }: { initial?: string; large?: boolean }) {
  const { t, pick } = useLang();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [suggestions, setSuggestions] = useState<ServiceListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(q.trim(), 250);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    api<Page<ServiceListItem>>(`/api/services/search?q=${encodeURIComponent(debounced)}&page_size=5`, { signal: ctrl.signal })
      .then((r) => setSuggestions(r.items))
      .catch(() => setSuggestions([]));
    return () => ctrl.abort();
  }, [debounced]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setOpen(false);
    if (active >= 0 && suggestions[active]) {
      router.push(`/services/${suggestions[active].slug}`);
    } else if (q.trim()) {
      router.push(`/services?q=${encodeURIComponent(q.trim())}`);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <form onSubmit={submit} role="search" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={t("সেবা খুঁজুন", "Search services")}
            placeholder={t("যেমন: পাসপোর্ট, জন্মনিবন্ধন, TIN…", "e.g. passport, birth registration, TIN…")}
            className={`w-full rounded-xl border border-navy-200 bg-white pl-10 pr-3 text-navy-900 placeholder:text-navy-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              large ? "h-14 text-base" : "h-10 text-sm"
            }`}
          />
        </div>
        <Button type="submit" variant="brand" size={large ? "lg" : "default"}>
          {t("খুঁজুন", "Search")}
        </Button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-navy-100 bg-white text-left shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => router.push(`/services/${s.slug}`)}
                className={`flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-navy-50 ${i === active ? "bg-navy-50" : ""}`}
              >
                <span className="font-medium text-navy-900">{pick(s.title_bn, s.title_en)}</span>
                <span className="text-xs text-navy-500">{pick(s.category.name_bn, s.category.name_en)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
