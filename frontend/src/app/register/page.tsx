"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, Input, Label } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export default function RegisterPage() {
  const { t } = useLang();
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError(t("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে", "Password must be at least 8 characters"));
      return;
    }
    setBusy(true);
    try {
      await register({ ...form, phone: form.phone || undefined });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 409 ? t("এই ইমেইল আগেই ব্যবহৃত হয়েছে", "This email is already registered") : err.message) : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6">
        <h1 className="mb-1 text-2xl font-bold">{t("নতুন অ্যাকাউন্ট", "Create account")}</h1>
        <p className="mb-5 text-sm text-navy-600">{t("সেবা সংরক্ষণ ও আবেদন ট্র্যাক করতে রেজিস্টার করুন।", "Register to save services and track applications.")}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("পূর্ণ নাম", "Full name")}</Label>
            <Input id="name" required minLength={2} autoComplete="name" value={form.full_name} onChange={set("full_name")} />
          </div>
          <div>
            <Label htmlFor="email">{t("ইমেইল", "Email")}</Label>
            <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <Label htmlFor="phone">{t("মোবাইল (ঐচ্ছিক)", "Phone (optional)")}</Label>
            <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <Label htmlFor="password">{t("পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)", "Password (min 8 characters)")}</Label>
            <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
          </div>
          <FieldError message={error} />
          <Button type="submit" variant="brand" className="w-full" disabled={busy}>
            {busy ? t("অপেক্ষা করুন…", "Please wait…") : t("রেজিস্টার", "Sign up")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          {t("আগেই অ্যাকাউন্ট আছে?", "Already have an account?")}{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">{t("লগইন", "Log in")}</Link>
        </p>
      </Card>
    </div>
  );
}
