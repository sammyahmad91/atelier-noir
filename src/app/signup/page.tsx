import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Open your atelier — Atelier Noir" };

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="A private salon"
      title={
        <>
          Open your <span className="italic text-gold">atelier</span>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
