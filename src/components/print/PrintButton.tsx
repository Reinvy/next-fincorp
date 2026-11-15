"use client";

import { Printer } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** The only place the app calls window.print(). */
export function PrintButton({
  label = "Cetak",
  variant = "secondary",
  size = "md",
  ...props
}: Omit<ButtonProps, "onClick"> & { label?: string }) {
  return (
    <Button
      variant={variant}
      size={size}
      className="no-print"
      onClick={() => window.print()}
      {...props}
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
