import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Sign in — Atelier Noir" };

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title={
        <>
          Return to the <span className="italic text-gold">atelier</span>
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
