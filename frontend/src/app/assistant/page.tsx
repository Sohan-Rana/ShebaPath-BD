"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Bot, History, Loader2, Plus, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";
import { FieldError } from "@/components/states";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import type { ChatMessage, ChatReply, ChatSession, ChatSessionDetail } from "@/lib/types";

export default function AssistantPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = () => {
    if (!user) {
      setSessions([]);
      return;
    }
    api<ChatSession[]>("/api/ai/sessions").then(setSessions).catch(() => {});
  };
  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setInput("");
    setSuggestions([]);
    setBusy(true);
    setMessages((m) => [
      ...m,
      { id: -Date.now(), role: "user", content: message, sources: null, verified: null, created_at: new Date().toISOString() },
    ]);
    try {
      const res = await api<ChatReply>("/api/ai/chat", { method: "POST", body: { message, session_id: sessionId } });
      setSessionId(res.session_id);
      setMessages((m) => [...m, res.message]);
      setSuggestions(res.suggestions);
      loadSessions();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? t("অনেক বেশি অনুরোধ। একটু পরে চেষ্টা করুন।", "Too many requests. Please try again shortly.")
          : e instanceof ApiError
            ? e.message
            : "Error",
      );
    } finally {
      setBusy(false);
    }
  };

  const openSession = async (id: string) => {
    setError(null);
    try {
      const s = await api<ChatSessionDetail>(`/api/ai/sessions/${id}`);
      setSessionId(s.id);
      setMessages(s.messages);
      setSuggestions([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error");
    }
  };

  const newChat = () => {
    setSessionId(null);
    setMessages([]);
    setSuggestions([]);
    setError(null);
  };

  const starters = [
    t("পাসপোর্টের জন্য কী কী কাগজ লাগে?", "What documents do I need for a passport?"),
    t("জন্মনিবন্ধনের ধাপগুলো বলুন", "Explain the birth registration steps"),
    t("ড্রাইভিং লাইসেন্সের ফি কত?", "What is the driving license fee?"),
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <Button variant="outline" className="mb-3 w-full" onClick={newChat}>
          <Plus className="h-4 w-4" aria-hidden /> {t("নতুন চ্যাট", "New chat")}
        </Button>
        <Card className="p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4" aria-hidden /> {t("আগের চ্যাট", "History")}
          </p>
          {!user ? (
            <p className="text-sm text-navy-600">
              <Link href="/login" className="font-medium text-brand-700 hover:underline">{t("লগইন করলে", "Log in")}</Link>{" "}
              {t("চ্যাট ইতিহাস সংরক্ষিত থাকবে।", "to keep your chat history.")}
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-navy-600">{t("এখনো কোনো চ্যাট নেই।", "No chats yet.")}</p>
          ) : (
            <ul className="space-y-1">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => openSession(s.id)}
                    className={cn("w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-navy-50", sessionId === s.id && "bg-navy-50 font-medium")}
                  >
                    <span className="line-clamp-1">{s.title}</span>
                    <span className="text-xs text-navy-500">{formatDate(s.updated_at, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>

      <section className="flex min-h-[70vh] flex-col">
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="note">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            {t(
              "এই AI শুধু যাচাইকৃত তথ্য থেকে উত্তর দেয় এবং সরকারি আবেদনের ডাটাবেসে প্রবেশ করতে পারে না। আবেদনের আগে অফিসিয়াল সূত্র দেখে নিন।",
              "This AI answers only from verified information and cannot access government application databases. Confirm with the official source before applying.",
            )}
          </p>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="grid place-items-center gap-3 py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                  <Bot className="h-7 w-7" aria-hidden />
                </span>
                <h1 className="text-xl font-bold">{t("ShebaPath AI", "ShebaPath AI")}</h1>
                <p className="max-w-md text-sm text-navy-600">
                  {t("সরকারি সেবা সম্পর্কে বাংলা বা ইংরেজিতে প্রশ্ন করুন।", "Ask about government services in Bangla or English.")}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {starters.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-navy-200 bg-white px-3 py-1.5 text-sm hover:bg-navy-50">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    m.role === "user" ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-900",
                  )}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                  {m.role === "assistant" && (
                    <div className="mt-3 border-t border-navy-100 pt-2 text-xs">
                      {m.verified ? (
                        <p className="mb-1 flex items-center gap-1 font-medium text-brand-700">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t("যাচাইকৃত তথ্যের ভিত্তিতে", "Based on verified information")}
                        </p>
                      ) : (
                        <p className="mb-1 flex items-center gap-1 font-medium text-amber-700">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> {t("যাচাইকৃত তথ্য পাওয়া যায়নি", "No verified information found")}
                        </p>
                      )}
                      {m.sources && m.sources.length > 0 && (
                        <ul className="space-y-1">
                          {m.sources.map((s, i) => (
                            <li key={i}>
                              [S{i + 1}]{" "}
                              {s.service_slug ? (
                                <Link href={`/services/${s.service_slug}`} className="text-brand-700 hover:underline">{s.title}</Link>
                              ) : (
                                <span>{s.title}</span>
                              )}
                              {s.url && (
                                <>
                                  {" · "}
                                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                                    {t("অফিসিয়াল লিংক", "Official link")}
                                  </a>
                                </>
                              )}
                              {s.verified_at && <span className="text-navy-500"> · {formatDate(s.verified_at, lang)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-navy-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("উত্তর খোঁজা হচ্ছে…", "Looking for an answer…")}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-navy-100 px-4 py-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-navy-200 px-3 py-1 text-xs hover:bg-navy-50">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-navy-100 p-3">
            <FieldError message={error} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="mt-2 flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                aria-label={t("আপনার প্রশ্ন", "Your question")}
                placeholder={t("আপনার প্রশ্ন লিখুন…", "Type your question…")}
              />
              <Button type="submit" variant="brand" disabled={busy || !input.trim()} aria-label={t("পাঠান", "Send")}>
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </div>
        </Card>
      </section>
    </div>
  );
}
