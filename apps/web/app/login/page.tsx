"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// 两种登录：
// 1) 邮箱 magic link（无密码）。注意 Supabase 自带邮件有每小时几封的限额，Day 2 换成自定义 SMTP（Resend）。
// 2) 邮箱 + 密码：先在 Supabase Dashboard → Authentication → Users → Add user（勾 Auto Confirm）建好账号。Day 1 用这个最省事。
export default function LoginPage() {
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
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">NewBee OS</h1>
        <p className="text-sm text-zinc-500">输入邮箱；有密码就填密码，没有就发登录链接</p>
      </div>
      {state === "sent" ? (
        <p className="rounded-md bg-emerald-50 p-4 text-emerald-800">邮件已发出，去邮箱点链接。</p>
      ) : (
        <form onSubmit={password ? signInPassword : sendLink} className="flex flex-col gap-3">
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码（可留空，改发登录链接）" className={input} />
          <button disabled={state === "sending"} className="h-12 rounded-md bg-[#1f5f8b] font-medium text-white disabled:opacity-60">
            {state === "sending" ? "请稍候…" : password ? "登录" : "发送登录链接"}
          </button>
          {state === "error" && <p className="text-sm text-red-600">{err}</p>}
        </form>
      )}
    </main>
  );
}
