import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 服务端（Server Components / Server Actions / Route Handlers）用，带用户会话，受 RLS 约束。
 *  React cache：同一个请求里只建一个客户端（cookie 一样），省去重复的会话解析。 */
export const createClient = cache(async () => {
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
});

/** 当前用户 id。每个请求只验一次：getClaims 在本地验 JWT 签名（JWKS 进程内缓存），不用每次都去问 Auth 服务器。
 *  proxy.ts 已经在每个请求刷新过会话，这里拿到的 token 一定是新鲜的。 */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** 只给后台任务用（抽取、定时任务）：绕过 RLS，绝不暴露给浏览器 */
export async function createServiceClient() {
  const { createClient: create } = await import("@supabase/supabase-js");
  return create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
