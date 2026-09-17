"use client";
// 写操作或页面出错时的兜底：把错误原文亮出来，给"重试"和"返回"，不让用户对着空白页猜。
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

export default function AgentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const el = typeof document !== "undefined" ? document.getElementById("nb-error-labels") : null;
  const L = (k: string, fallback: string) => el?.dataset[k] || fallback;
  return (
    <div className="mx-auto mt-10 flex max-w-lg flex-col gap-3 rounded-ui border border-danger/40 bg-surface p-5">
      <div className="text-base font-semibold text-danger">{L("title", "Something went wrong")}</div>
      <p className="break-words font-mono text-sm text-muted">{error.message}</p>
      <div className="flex gap-2">
        <Button type="button" onClick={() => reset()}>{L("retry", "Retry")}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>{L("back", "Back")}</Button>
      </div>
    </div>
  );
}
