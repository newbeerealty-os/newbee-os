// 联系人相关的服务端小组件
export function InitialsAvatar({ text, size = "md" }: { text: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-7 w-7 text-[10.5px]" : "h-9 w-9 text-xs";
  return <span className={`grid shrink-0 place-items-center rounded-full bg-accent-soft font-mono font-semibold text-accent-strong ${cls}`}>{text}</span>;
}
