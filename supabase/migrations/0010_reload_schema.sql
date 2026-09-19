-- 新建函数后 PostgREST 的 schema cache 没刷新（"Could not find the function public.app_bootstrap"），通知它重载
notify pgrst, 'reload schema';
