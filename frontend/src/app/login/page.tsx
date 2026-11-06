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

export default function LoginPage() {
  const { t } = useLang();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email, password);
      router.push(u.role_name === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 401 ? t("ইমেইল বা পাসওয়ার্ড ভুল", "Incorrect email or password") : err.message) : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6">
        <h1 className="mb-1 text-2xl font-bold">{t("লগইন", "Log in")}</h1>
        <p className="mb-5 text-sm text-navy-600">{t("আপনার অ্যাকাউন্টে প্রবেশ করুন।", "Sign in to your account.")}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t("ইমেইল", "Email")}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">{t("পাসওয়ার্ড", "Password")}</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <FieldError message={error} />
          <Button type="submit" variant="brand" className="w-full" disabled={busy}>
            {busy ? t("অপেক্ষা করুন…", "Please wait…") : t("লগইন", "Log in")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          {t("অ্যাকাউন্ট নেই?", "No account?")}{" "}
          <Link href="/register" className="font-medium text-brand-700 hover:underline">
            {t("রেজিস্টার করুন", "Sign up")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
