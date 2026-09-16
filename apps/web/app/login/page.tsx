// /login —— server 外壳：按 locale 算好文案，交给 client 表单
import { getT } from "@/lib/i18n";
import { LocaleSwitch } from "@/components/locale-switch";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">NewBee OS</h1>
          <p className="text-sm text-muted">{t("login.subtitle")}</p>
        </div>
        <LocaleSwitch />
      </div>
      <LoginForm labels={{ passwordPlaceholder: t("login.passwordPlaceholder"), wait: t("login.wait"), signIn: t("login.signIn"), sendLink: t("login.sendLink"), sent: t("login.sent"), emailTabHint: t("contact.emailTabHint") }} />
    </main>
  );
}
