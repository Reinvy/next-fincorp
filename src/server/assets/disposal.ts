import { withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D } from "@/lib/money";
import type { Actor } from "@/lib/types";
import { postJournal, type JournalLineInput } from "@/server/accounting/posting";
import { getAccountByCode } from "@/server/accounting/accounts";

export interface DisposeAssetInput {
  assetId: string;
  date: Date;
  proceeds: string;
  bankAccountId?: string | null;
  note?: string | null;
}

export async function disposeFixedAsset(actor: Actor, input: DisposeAssetInput): Promise<{ number: string; gainLoss: number }> {
  const proceeds = D(input.proceeds);
  if (proceeds.isNegative()) throw new DomainError("INVALID_INPUT", "Nilai pelepasan tidak boleh negatif.");

  return withFinancialTx(async (tx) => {
    const asset = await tx.fixedAsset.findFirst({
      where: { id: input.assetId, companyId: actor.companyId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        purchasePrice: true,
        accumulatedDepreciation: true,
        assetAccountId: true,
        accumulatedAccountId: true,
      },
    });
    if (!asset) throw new DomainError("NOT_FOUND", "Aset tidak ditemukan.");
    if (asset.status === "DISPOSED") throw new DomainError("INVALID_STATUS", "Aset sudah dilepas.");

    const bookValue = D(asset.purchasePrice).minus(D(asset.accumulatedDepreciation));
    const gainLoss = proceeds.minus(bookValue);
    const lossAccount = await getAccountByCode(tx, actor.companyId, "6910");
    const gainAccount = await getAccountByCode(tx, actor.companyId, "6920");

    let bankCoaId: string | null = null;
    if (proceeds.greaterThan(0)) {
      if (!input.bankAccountId) throw new DomainError("INVALID_INPUT", "Pilih rekening penerima hasil pelepasan.");
      const bank = await tx.bankAccount.findFirst({
        where: { id: input.bankAccountId, companyId: actor.companyId },
        include: { coaAccount: { select: { id: true, isActive: true } } },
      });
      if (!bank) throw new DomainError("INVALID_INPUT", "Rekening penerima tidak ditemukan.");
      if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening penerima tidak aktif.");
      bankCoaId = bank.coaAccountId;
    }

    const lines: JournalLineInput[] = [];
    const accumulated = D(asset.accumulatedDepreciation);
    if (accumulated.greaterThan(0)) {
      lines.push({ accountId: asset.accumulatedAccountId, debit: accumulated.toFixed(2), credit: "0" });
    }
    if (bankCoaId && proceeds.greaterThan(0)) {
      lines.push({ accountId: bankCoaId, debit: proceeds.toFixed(2), credit: "0" });
    }
    if (gainLoss.lessThan(0)) {
      lines.push({ accountId: lossAccount.id, debit: gainLoss.abs().toFixed(2), credit: "0" });
    }
    lines.push({ accountId: asset.assetAccountId, debit: "0", credit: D(asset.purchasePrice).toFixed(2) });
    if (gainLoss.greaterThan(0)) {
      lines.push({ accountId: gainAccount.id, debit: "0", credit: gainLoss.toFixed(2) });
    }

    const journal = await postJournal(tx, actor, {
      date: input.date,
      description: `Pelepasan aset ${asset.code} ${asset.name}`,
      reference: input.note?.trim() || null,
      type: "DISPOSAL",
      sourceType: "ASSET_DISPOSAL",
      sourceId: asset.id,
      lines,
    });

    await tx.fixedAsset.update({
      where: { id: asset.id },
      data: {
        status: "DISPOSED",
        disposalDate: input.date,
        disposalProceeds: proceeds.toFixed(2),
        disposalGainLoss: gainLoss.toFixed(2),
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "DISPOSE",
      entityType: "FixedAsset",
      entityId: asset.id,
      summary: `Melepas aset ${asset.code} dengan hasil ${proceeds.toFixed(0)} (${gainLoss.greaterThanOrEqualTo(0) ? "laba" : "rugi"} ${gainLoss.abs().toFixed(0)})`,
      metadata: { journal: journal.number, bookValue: bookValue.toFixed(2) },
    });

    return { number: journal.number, gainLoss: gainLoss.toNumber() };
  });
}
