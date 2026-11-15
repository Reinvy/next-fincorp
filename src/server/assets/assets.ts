import { prisma, withFinancialTx, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D, type Moneyish } from "@/lib/money";
import type { Actor, AssetFundingType, AssetStatus, DepreciationMethod } from "@/lib/types";
import type { FixedAssetView } from "@/lib/dto";
import { DOCUMENT_KEYS, nextDocumentNumber } from "@/server/accounting/numbering";
import { postJournal } from "@/server/accounting/posting";

export interface FixedAssetInput {
  code?: string | null;
  name: string;
  category: string;
  purchaseDate: Date;
  purchasePrice: string;
  residualValue: string;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  annualRate?: string | null;
  assetAccountId: string;
  accumulatedAccountId: string;
  depreciationExpenseAccountId: string;
  fundingType: AssetFundingType;
  fundingAccountId: string;
  location?: string | null;
  responsible?: string | null;
}

async function validateAccounts(tx: Tx, actor: Actor, input: FixedAssetInput) {
  const ids = [input.assetAccountId, input.accumulatedAccountId, input.depreciationExpenseAccountId];
  const accounts = await tx.glAccount.findMany({
    where: { id: { in: ids }, companyId: actor.companyId },
    select: { id: true, code: true, name: true, systemRole: true, isActive: true, children: { select: { id: true } } },
  });
  if (accounts.length !== 3) throw new DomainError("INVALID_INPUT", "Akun aset tidak ditemukan.");
  for (const account of accounts) {
    if (!account.isActive) throw new DomainError("INVALID_INPUT", `Akun ${account.code} tidak aktif.`);
    if (account.children.length > 0) throw new DomainError("INVALID_INPUT", `Akun ${account.code} adalah akun induk.`);
  }
  const assetAccount = accounts.find((account) => account.id === input.assetAccountId);
  const accumulated = accounts.find((account) => account.id === input.accumulatedAccountId);
  const expense = accounts.find((account) => account.id === input.depreciationExpenseAccountId);
  if (assetAccount?.systemRole !== "FIXED_ASSET") {
    throw new DomainError("INVALID_INPUT", "Akun aset harus memiliki peran FIXED_ASSET.");
  }
  if (accumulated?.systemRole !== "ACCUMULATED_DEPRECIATION") {
    throw new DomainError("INVALID_INPUT", "Akun akumulasi harus memiliki peran ACCUMULATED_DEPRECIATION.");
  }
  if (expense?.systemRole !== "DEPRECIATION_EXPENSE") {
    throw new DomainError("INVALID_INPUT", "Akun beban harus memiliki peran DEPRECIATION_EXPENSE.");
  }
  return { assetAccount, accumulated, expense };
}

export async function createFixedAsset(actor: Actor, input: FixedAssetInput): Promise<{ id: string; code: string }> {
  const name = input.name.trim();
  const category = input.category.trim();
  if (!name || name.length > 120) throw new DomainError("INVALID_INPUT", "Nama aset wajib diisi, maksimal 120 karakter.");
  if (!category || category.length > 80) throw new DomainError("INVALID_INPUT", "Kategori aset wajib diisi.");
  const cost = D(input.purchasePrice);
  const residual = D(input.residualValue);
  if (!cost.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Harga perolehan harus lebih dari nol.");
  if (residual.isNegative() || residual.greaterThanOrEqualTo(cost)) {
    throw new DomainError("INVALID_INPUT", "Nilai residu harus 0 dan lebih kecil dari harga perolehan.");
  }
  if (input.usefulLifeMonths < 1 || input.usefulLifeMonths > 600) {
    throw new DomainError("INVALID_INPUT", "Umur manfaat harus 1–600 bulan.");
  }
  if (input.method === "DECLINING_BALANCE" && input.annualRate) {
    const rate = D(input.annualRate);
    if (rate.isNegative() || rate.greaterThan(100)) throw new DomainError("INVALID_INPUT", "Tarif penyusutan harus 0–100%.");
  }

  return withFinancialTx(async (tx) => {
    const { assetAccount } = await validateAccounts(tx, actor, input);
    const bank = await tx.bankAccount.findFirst({
      where: { id: input.fundingAccountId, companyId: actor.companyId },
      include: { coaAccount: { select: { id: true, name: true, isActive: true } } },
    });
    if (!bank) throw new DomainError("INVALID_INPUT", "Rekening pendanaan tidak ditemukan.");
    if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening pendanaan tidak aktif.");
    if (bank.type !== input.fundingType) {
      throw new DomainError("INVALID_INPUT", "Jenis pendanaan tidak cocok dengan rekening yang dipilih.");
    }

    let code = input.code?.trim() || "";
    if (code.length > 30) throw new DomainError("INVALID_INPUT", "Kode aset maksimal 30 karakter.");
    if (!code) {
      code = await nextDocumentNumber(tx, actor.companyId, DOCUMENT_KEYS.ASSET.key, DOCUMENT_KEYS.ASSET.prefix, input.purchaseDate);
    } else {
      const duplicate = await tx.fixedAsset.findUnique({
        where: { companyId_code: { companyId: actor.companyId, code } },
        select: { id: true },
      });
      if (duplicate) throw new DomainError("DUPLICATE", `Kode aset ${code} sudah dipakai.`);
    }

    const asset = await tx.fixedAsset.create({
      data: {
        companyId: actor.companyId,
        code,
        name,
        category,
        purchaseDate: input.purchaseDate,
        purchasePrice: cost.toFixed(2),
        residualValue: residual.toFixed(2),
        usefulLifeMonths: input.usefulLifeMonths,
        method: input.method,
        annualRate: input.annualRate ? D(input.annualRate).toFixed(2) : null,
        assetAccountId: input.assetAccountId,
        accumulatedAccountId: input.accumulatedAccountId,
        depreciationExpenseAccountId: input.depreciationExpenseAccountId,
        fundingType: input.fundingType,
        location: input.location?.trim() || null,
        responsible: input.responsible?.trim() || null,
        createdById: actor.userId,
      },
      select: { id: true, code: true },
    });

    const journal = await postJournal(tx, actor, {
      date: input.purchaseDate,
      description: `Perolehan aset ${code} ${name}`,
      type: "MANUAL",
      sourceType: "ASSET_ACQUISITION",
      sourceId: asset.id,
      lines: [
        { accountId: assetAccount!.id, debit: cost.toFixed(2), credit: "0" },
        { accountId: bank.coaAccountId, debit: "0", credit: cost.toFixed(2) },
      ],
    });
    await tx.fixedAsset.update({ where: { id: asset.id }, data: { acquisitionJournalId: journal.id } });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "CREATE",
      entityType: "FixedAsset",
      entityId: asset.id,
      summary: `Membeli aset ${code} ${name} sebesar ${cost.toFixed(0)}`,
      metadata: { journal: journal.number, funding: bank.name },
    });

    return asset;
  });
}

async function enrich(assets: Array<{
  id: string;
  code: string;
  name: string;
  category: string;
  purchaseDate: Date;
  purchasePrice: Moneyish;
  residualValue: Moneyish;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  annualRate: Moneyish | null;
  accumulatedDepreciation: Moneyish;
  status: AssetStatus;
  disposalDate: Date | null;
  disposalProceeds: Moneyish | null;
  disposalGainLoss: Moneyish | null;
  fundingType: string;
  location: string | null;
  responsible: string | null;
  assetAccountId: string;
  accumulatedAccountId: string;
  depreciationExpenseAccountId: string;
}>): Promise<FixedAssetView[]> {
  const accountIds = Array.from(
    new Set(assets.flatMap((asset) => [asset.assetAccountId, asset.accumulatedAccountId, asset.depreciationExpenseAccountId])),
  );
  const accounts = await prisma.glAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true },
  });
  const nameById = new Map(accounts.map((account) => [account.id, `${account.code} · ${account.name}`]));

  return assets.map((asset) => {
    const cost = D(asset.purchasePrice);
    const residual = D(asset.residualValue);
    const accumulated = D(asset.accumulatedDepreciation);
    const bookValue = cost.minus(accumulated);
    const depreciable = cost.minus(residual);
    let monthly = 0;
    if (asset.method === "STRAIGHT_LINE") {
      monthly = Math.round(depreciable.toNumber() / asset.usefulLifeMonths);
    } else {
      const rate = asset.annualRate
        ? D(asset.annualRate).toNumber()
        : 200 / (asset.usefulLifeMonths / 12);
      monthly = Math.round((bookValue.toNumber() * rate) / 100 / 12);
    }
    return {
      id: asset.id,
      code: asset.code,
      name: asset.name,
      category: asset.category,
      purchaseDate: asset.purchaseDate.toISOString().slice(0, 10),
      purchasePrice: cost.toNumber(),
      residualValue: residual.toNumber(),
      usefulLifeMonths: asset.usefulLifeMonths,
      method: asset.method,
      annualRate: asset.annualRate ? D(asset.annualRate).toNumber() : null,
      accumulatedDepreciation: accumulated.toNumber(),
      bookValue: bookValue.toNumber(),
      status: asset.status,
      disposalDate: asset.disposalDate?.toISOString().slice(0, 10) ?? null,
      disposalProceeds: asset.disposalProceeds ? D(asset.disposalProceeds).toNumber() : null,
      disposalGainLoss: asset.disposalGainLoss ? D(asset.disposalGainLoss).toNumber() : null,
      assetAccountName: nameById.get(asset.assetAccountId) ?? "—",
      accumulatedAccountName: nameById.get(asset.accumulatedAccountId) ?? "—",
      depreciationExpenseAccountName: nameById.get(asset.depreciationExpenseAccountId) ?? "—",
      fundingType: asset.fundingType,
      location: asset.location,
      responsible: asset.responsible,
      monthlyDepreciation: Math.max(0, monthly),
    };
  });
}

export async function listFixedAssets(
  actor: Actor,
  filters: { q?: string; status?: AssetStatus; category?: string } = {},
): Promise<FixedAssetView[]> {
  const assets = await prisma.fixedAsset.findMany({
    where: {
      companyId: actor.companyId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.q?.trim()
        ? {
            OR: [
              { code: { contains: filters.q.trim(), mode: "insensitive" as const } },
              { name: { contains: filters.q.trim(), mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ purchaseDate: "desc" }, { code: "desc" }],
  });
  return enrich(assets);
}

export async function getFixedAsset(actor: Actor, assetId: string): Promise<FixedAssetView> {
  const asset = await prisma.fixedAsset.findFirst({ where: { id: assetId, companyId: actor.companyId } });
  if (!asset) throw new DomainError("NOT_FOUND", "Aset tidak ditemukan.");
  const [view] = await enrich([asset]);
  return view;
}

export async function getAssetCategories(actor: Actor): Promise<string[]> {
  const rows = await prisma.fixedAsset.findMany({
    where: { companyId: actor.companyId },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((row) => row.category);
}
