"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissAlertAction } from "@/actions/alerts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DismissAlertButton({ alertKey }: { alertKey: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await dismissAlertAction(alertKey);
          if (result.status === "error") toast.error(result.message);
          if (result.status === "success") {
            toast.success(result.message);
            router.refresh();
          }
        })
      }
    >
      {pending ? "…" : "Sembunyikan"}
    </Button>
  );
}
