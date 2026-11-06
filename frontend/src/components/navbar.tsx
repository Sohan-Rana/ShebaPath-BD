"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Compass, Languages, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("হোম", "Home") },
    { href: "/services", label: t("সেবাসমূহ", "Services") },
    { href: "/assistant", label: t("AI সহকারী", "AI Assistant") },
    { href: "/about", label: t("সম্পর্কে", "About") },
    { href: "/contact", label: t("যোগাযোগ", "Contact") },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-navy-900">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-900 text-white">
            <Compass className="h-5 w-5" aria-hidden />
          </span>
          <span>
            Sheba<span className="text-brand-600">Path</span> BD
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50",
                isActive(l.href) && "bg-navy-50 text-navy-900",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            aria-label={t("Switch to English", "বাংলায় দেখুন")}
          >
            <Languages className="h-4 w-4" aria-hidden />
            {lang === "bn" ? "EN" : "বাং"}
          </Button>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={user.role_name === "admin" ? "/admin" : "/dashboard"}>
                    {user.role_name === "admin" ? t("অ্যাডমিন", "Admin") : t("ড্যাশবোর্ড", "Dashboard")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  {t("লগআউট", "Logout")}
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">{t("লগইন", "Login")}</Link>
                </Button>
                <Button asChild variant="brand" size="sm">
                  <Link href="/register">{t("রেজিস্টার", "Sign up")}</Link>
                </Button>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t border-navy-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {[
              ...links,
              ...(user
                ? [{ href: user.role_name === "admin" ? "/admin" : "/dashboard", label: t("ড্যাশবোর্ড", "Dashboard") }]
                : [
                    { href: "/login", label: t("লগইন", "Login") },
                    { href: "/register", label: t("রেজিস্টার", "Sign up") },
                  ]),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-50"
              >
                {l.label}
              </Link>
            ))}
            {user && (
              <button
                className="rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-navy-50"
                onClick={() => {
                  logout();
                  setOpen(false);
                  router.push("/");
                }}
              >
                {t("লগআউট", "Logout")}
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
