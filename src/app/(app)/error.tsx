"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="paper-sheet mx-auto max-w-lg px-6 py-10 text-center">
      <p className="eyebrow">Terjadi kesalahan</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Halaman gagal dimuat</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Data tidak berubah. Coba muat ulang halaman; jika tetap gagal, hubungi admin dengan kode berikut.
      </p>
      {error.digest ? <p className="mt-3 font-mono text-xs text-ink-faint">{error.digest}</p> : null}
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" onClick={() => reset()}>
          Coba lagi
        </Button>
      </div>
    </div>
  );
}
