"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/paper";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@fincorp.id", password: "FinCorp#2026" },
  { label: "Akuntan", email: "akuntan@fincorp.id", password: "Akuntan#2026" },
  { label: "Pengamat", email: "viewer@fincorp.id", password: "Viewer#2026" },
];

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if (signInError) {
      setError(
        signInError.code === "INVALID_EMAIL_OR_PASSWORD" || signInError.status === 401
          ? "Email atau kata sandi salah."
          : (signInError.message ?? "Gagal masuk. Coba lagi."),
      );
      setPending(false);
      return;
    }
    router.replace(safeNext(searchParams.get("next")));
    router.refresh();
  }

  return (
    <div className="w-full">
      <p className="eyebrow">Buku besar perusahaan</p>
      <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink">Masuk ke FinCorp</h1>
      <p className="mt-2 text-sm text-ink-soft">Gunakan email dan kata sandi akun perusahaan Anda.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
        <Field label="Kata sandi" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? (
          <p role="alert" className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-[13px] text-vermilion">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Memproses…" : "Masuk"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-ink-soft">
        Belum punya akun?{" "}
        <Link href="/register" className="text-forest underline underline-offset-4">
          Daftar
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" ? (
        <section className="mt-8 border-t border-dashed border-rule pt-4">
          <div className="flex items-center gap-2">
            <Stamp tone="gold">Demo</Stamp>
            <span className="text-[11px] text-ink-faint">Akun contoh untuk melihat isi aplikasi.</span>
          </div>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[2px] px-1 py-1 text-left text-[12px] hover:bg-paper-light"
                >
                  <span className="text-ink">{account.label}</span>
                  <span className="font-mono text-[10px] text-ink-faint">{account.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
