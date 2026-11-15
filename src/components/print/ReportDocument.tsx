import type { ReactNode } from "react";
import type { CompanyLetterhead } from "@/components/print/PrintHeader";
import { PrintHeader, SignatureBlock } from "@/components/print/PrintHeader";

export function ReportDocument({
  company,
  title,
  subtitle,
  meta,
  actions,
  children,
  signature = true,
  notes,
}: {
  company: CompanyLetterhead;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  signature?: boolean;
  notes?: ReactNode;
}) {
  return (
    <div className="paper-sheet print-sheet p-4 sm:p-6">
      <PrintHeader company={company} title={title} subtitle={subtitle} meta={meta} actions={actions} />
      <div className="mt-4">{children}</div>
      {notes ? <div className="mt-4 border-t border-rule pt-2 text-[11px] text-ink-faint">{notes}</div> : null}
      {signature ? <SignatureBlock left="Dibuat oleh" middle="Diperiksa" right="Disetujui" /> : null}
    </div>
  );
}
