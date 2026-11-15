"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setPending(true);
    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    if (signUpError) {
      setError(
        signUpError.code === "USER_ALREADY_EXISTS"
          ? "Email sudah terdaftar. Silakan masuk."
          : (signUpError.message ?? "Gagal mendaftar. Coba lagi."),
      );
      setPending(false);
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <div className="w-full">
      <p className="eyebrow">Akun baru</p>
      <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink">Buat akun FinCorp</h1>
      <p className="mt-2 text-sm text-ink-soft">Setelah mendaftar, Anda membuat perusahaan pertama dan menjadi admin.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Nama lengkap" htmlFor="name" required>
          <Input id="name" name="name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Kata sandi" htmlFor="password" hint="Minimal 8 karakter." required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Ulangi kata sandi" htmlFor="confirm" required>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
        {error ? (
          <p role="alert" className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-[13px] text-vermilion">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Memproses…" : "Daftar"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-ink-soft">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-forest underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </div>
  );
}
