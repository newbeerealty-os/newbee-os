// 路由切换时的骨架：侧栏不动，内容区先给个形状，数据到了再替换。让"点了没反应"的那 300–800ms 有东西看。
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl animate-pulse flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between"><div className="h-7 w-48 rounded-md bg-chip" /><div className="h-10 w-40 rounded-md bg-chip" /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-ui border border-line bg-surface" />)}</div>
      <div className="h-64 rounded-ui border border-line bg-surface" />
    </div>
  );
}
