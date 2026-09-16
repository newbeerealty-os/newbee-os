"use client";
// "按日出日落自动"模式：服务端算好下一次切换的时刻和目标主题，客户端到点就换 data-theme，
// 然后 router.refresh() 让服务端给出再下一次的安排。每分钟核对一次，页签睡过头也不会漏。
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ThemeAutoSwitch({ switchAt, switchTo }: { switchAt: number; switchTo: string }) {
  const router = useRouter();
  useEffect(() => {
    let done = false;
    const check = () => {
      if (done || Date.now() < switchAt) return;
      done = true;
      document.documentElement.dataset.theme = switchTo;
      router.refresh();
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [switchAt, switchTo, router]);
  return null;
}
