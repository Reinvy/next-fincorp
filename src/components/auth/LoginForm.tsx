"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-semibold">Masuk ke FinCorp</h1>
      <p className="mt-1 text-sm text-neutral-600">Pembukuan perusahaan dalam satu buku.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Kata sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Belum punya akun?{" "}
        <Link href="/register" className="underline">
          Daftar
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" ? (
        <section className="mt-8 rounded border border-dashed border-neutral-300 p-4">
          <h2 className="text-sm font-semibold">Akun demo</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                >
                  {account.label}: {account.email} / {account.password}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
