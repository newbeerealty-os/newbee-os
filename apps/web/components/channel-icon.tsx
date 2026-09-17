// 联系方式类别的图标（电话 / 短信 / 邮件 / 微信 / WhatsApp）。纯 SVG，服务端 / 客户端都能用。
const PATHS: Record<string, React.ReactNode> = {
  phone: <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  sms: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8M8 13h5" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  wechat: <><path d="M9.5 4C5.9 4 3 6.4 3 9.4c0 1.7.9 3.2 2.4 4.2L4.8 16l2.6-1.3c.7.2 1.4.3 2.1.3h.4a5.6 5.6 0 0 1-.3-1.6c0-3.3 3.1-6 7-6h.6C16.5 5.2 13.4 4 9.5 4Z" /><path d="M16.5 8.5c-3.3 0-6 2.2-6 4.9s2.7 4.9 6 4.9c.6 0 1.2-.1 1.8-.2L20.5 19l-.5-1.9c1.2-.9 2-2.2 2-3.7 0-2.7-2.7-4.9-5.5-4.9Z" /></>,
  whatsapp: <><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 1a5 5 0 0 1-2.4-2.4l1-1-1-2Z" /></>,
};

export function ChannelIcon({ kind, className = "h-4 w-4" }: { kind: string; className?: string }) {
  const p = PATHS[kind];
  if (!p) return null;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">{p}</svg>;
}
