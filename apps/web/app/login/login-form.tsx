"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// 两种登录：
// 1) 邮箱 magic link（无密码）。注意 Supabase 自带邮件有每小时几封的限额，之后换成自定义 SMTP（Resend）。
// 2) 邮箱 + 密码：先在 Supabase Dashboard → Authentication → Users → Add user（勾 Auto Confirm）建好账号。
// 文案由 server 端的 page.tsx 按 locale 算好传进来；Supabase 的 error.message 是后台文本，原样显示。
export interface LoginLabels {
  passwordPlaceholder: string;
  wait: string;
  signIn: string;
  sendLink: string;
  sent: string;
}

export function LoginForm({ labels }: { labels: LoginLabels }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) { setErr(error.message); setState("error"); } else setState("sent");
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setState("error"); return; }
    location.href = "/today";
  }

  const input = "h-12 w-full rounded-md border border-zinc-300 px-3 text-base";
  if (state === "sent") return <p className="rounded-md bg-emerald-50 p-4 text-emerald-800">{labels.sent}</p>;
  return (
    <form onSubmit={password ? signInPassword : sendLink} className="flex flex-col gap-3">
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={labels.passwordPlaceholder} className={input} />
      <button disabled={state === "sending"} className="h-12 rounded-md bg-[#1f5f8b] font-medium text-white disabled:opacity-60">
        {state === "sending" ? labels.wait : password ? labels.signIn : labels.sendLink}
      </button>
      {state === "error" && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
