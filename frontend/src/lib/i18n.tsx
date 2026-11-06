"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "bn" | "en";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** t("বাংলা", "English") */
  t: (bn: string, en: string) => string;
  /** pick(item.title_bn, item.title_en) — bn khali hole en */
  pick: (bn?: string | null, en?: string | null) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sp_lang");
      if (saved === "bn" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("sp_lang", l);
    } catch {}
  }, []);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (bn, en) => (lang === "bn" ? bn : en),
      pick: (bn, en) => (lang === "bn" ? bn || en || "" : en || bn || ""),
    }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
