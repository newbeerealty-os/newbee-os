import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 服务端（Server Components / Server Actions / Route Handlers）用，带用户会话，受 RLS 约束 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component 里不能写 cookie，忽略；Server Action / Route Handler 可以
        }
      },
    },
  });
}

/** 只给后台任务用（抽取、定时任务）：绕过 RLS，绝不暴露给浏览器 */
export async function createServiceClient() {
  const { createClient: create } = await import("@supabase/supabase-js");
  return create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
