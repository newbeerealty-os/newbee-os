-- 里程碑分两种：event（已发生 / 将发生的事，过期不算逾期）、deadline（期限，过期 = 逾期）。缺省 deadline，旧行全是 deadline。
alter table milestones add column kind text not null default 'deadline' check (kind in ('event', 'deadline'));
notify pgrst, 'reload schema';
