import { NextResponse } from "next/server";
import { getActorContext } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { dateFromISO, monthBounds, todayISO } from "@/lib/dates";
import { getAgingReport } from "@/server/accounting/aging";
import {
  getBalanceSheet,
  getCashFlow,
  getEquityStatement,
  getIncomeStatement,
} from "@/server/accounting/reports";
import { getTrialBalance } from "@/server/accounting/trial-balance";
import { getLedgerReport } from "@/server/accounting/journals";
import { listSalesInvoices } from "@/server/sales/invoices";
import { listPurchaseInvoices } from "@/server/purchases/invoices";
import { listFixedAssets } from "@/server/assets/assets";
import { getTaxSummary } from "@/server/tax/tax";
import { listEfakturInvoices } from "@/server/tax/efaktur";
import { toCsv } from "@/lib/csv";

const KNOWN_REPORTS: Record<string, true> = {
  "trial-balance": true,
  "balance-sheet": true,
  "income-statement": true,
  "cash-flow": true,
  equity: true,
  "aging-ar": true,
  "aging-ap": true,
  "tax-ppn": true,
  "general-ledger": true,
  invoices: true,
  purchases: true,
  assets: true,
  efaktur: true,
  backup: true,
};

function csvResponse(rows: Array<Array<string | number | null | undefined>>, filename: string): Response {
  const body = `\uFEFF${toCsv(rows)}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function jsonResponse(data: unknown, filename: string): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function range(searchParams: URLSearchParams) {
  const today = dateFromISO(todayISO());
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const from = fromRaw ? dateFromISO(fromRaw) : monthBounds(todayISO().slice(0, 7)).start;
  const to = toRaw ? dateFromISO(toRaw) : today;
  return { from, to };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ report: string }> },
): Promise<Response> {
  const { report } = await context.params;
  if (!KNOWN_REPORTS[report]) return new NextResponse("Laporan tidak ditemukan", { status: 404 });

  const actorContext = await getActorContext();
  if (!actorContext?.actor) return new NextResponse("Tidak terautentikasi", { status: 401 });
  const actor = actorContext.actor;
  const url = new URL(request.url);
  const { from, to } = range(url.searchParams);
  const asOfRaw = url.searchParams.get("asOf");
  const asOf = asOfRaw ? dateFromISO(asOfRaw) : to;
  const periodRaw = url.searchParams.get("period");
  const period = periodRaw && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodRaw) ? periodRaw : todayISO().slice(0, 7);
  const stamp = todayISO();

  switch (report) {
    case "trial-balance": {
      const data = await getTrialBalance(actor, asOf);
      const rows: Array<Array<string | number>> = [
        ["Kode", "Nama akun", "Kelompok", "Debit", "Kredit"],
      ];
      for (const group of data.groups) {
        for (const account of group.accounts) {
          rows.push([account.code, account.name, group.label, account.debit.toFixed(2), account.credit.toFixed(2)]);
        }
      }
      rows.push(["", "TOTAL", "", data.totalDebit.toFixed(2), data.totalCredit.toFixed(2)]);
      return csvResponse(rows, `neraca-saldo-${asOf.toISOString().slice(0, 10)}.csv`);
    }
    case "balance-sheet": {
      const data = await getBalanceSheet(actor, asOf);
      const rows: Array<Array<string | number>> = [["Bagian", "Kode", "Nama", "Jumlah"]];
      for (const section of data.assetSections) {
        for (const line of section.lines) rows.push([section.label, line.code, line.label, line.amount.toFixed(2)]);
        rows.push([section.label, "", "Subtotal", section.total.toFixed(2)]);
      }
      rows.push(["ASET", "", "TOTAL ASET", data.totalAssets.toFixed(2)]);
      for (const section of data.liabilitySections) {
        for (const line of section.lines) rows.push([section.label, line.code, line.label, line.amount.toFixed(2)]);
        rows.push([section.label, "", "Subtotal", section.total.toFixed(2)]);
      }
      rows.push(["LIABILITAS", "", "TOTAL LIABILITAS", data.totalLiabilities.toFixed(2)]);
      for (const section of data.equitySections) {
        for (const line of section.lines) rows.push([section.label, line.code, line.label, line.amount.toFixed(2)]);
      }
      rows.push(["EKUITAS", "", "TOTAL EKUITAS", data.totalEquity.toFixed(2)]);
      return csvResponse(rows, `neraca-${asOf.toISOString().slice(0, 10)}.csv`);
    }
    case "income-statement": {
      const data = await getIncomeStatement(actor, from, to);
      const rows: Array<Array<string | number>> = [["Bagian", "Kode", "Nama", "Periode ini", "Periode lalu"]];
      for (const section of data.sections) {
        for (const line of section.lines) {
          rows.push([section.label, line.code, line.label, line.amount.toFixed(2), line.previous.toFixed(2)]);
        }
        rows.push([section.label, "", "Subtotal", section.total.toFixed(2), section.previousTotal.toFixed(2)]);
      }
      rows.push(["", "", "LABA BERSIH", data.netProfit.toFixed(2), data.previousNetProfit.toFixed(2)]);
      return csvResponse(rows, `laba-rugi-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`);
    }
    case "cash-flow": {
      const data = await getCashFlow(actor, from, to);
      const rows: Array<Array<string | number>> = [
        ["Bagian", "Tanggal", "Jurnal", "Keterangan", "Jumlah"],
        ["Saldo awal", "", "", "", data.opening.toFixed(2)],
      ];
      for (const row of data.rows) rows.push([row.classification, row.date, row.number, row.description, row.amount.toFixed(2)]);
      rows.push(["OPERATING", "", "", "Total operasi", data.operating.toFixed(2)]);
      rows.push(["INVESTING", "", "", "Total investasi", data.investing.toFixed(2)]);
      rows.push(["FINANCING", "", "", "Total pendanaan", data.financing.toFixed(2)]);
      rows.push(["", "", "", "Perubahan kas", data.netChange.toFixed(2)]);
      rows.push(["", "", "", "Saldo akhir", data.closing.toFixed(2)]);
      return csvResponse(rows, `arus-kas-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`);
    }
    case "equity": {
      const data = await getEquityStatement(actor, from, to);
      const rows: Array<Array<string | number>> = [["Kode", "Nama", "Awal", "Mutasi", "Akhir"]];
      for (const row of data.rows) {
        rows.push([row.code, row.label, row.beginning.toFixed(2), row.movement.toFixed(2), row.ending.toFixed(2)]);
      }
      rows.push(["", "Laba ditahan awal", data.beginningEarnings.toFixed(2), "", ""]);
      rows.push(["", "Laba periode", data.netProfit.toFixed(2), "", ""]);
      rows.push(["", "TOTAL EKUITAS", data.endingEquity.toFixed(2), "", ""]);
      return csvResponse(rows, `perubahan-ekuitas-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`);
    }
    case "aging-ar":
    case "aging-ap": {
      const type = report === "aging-ar" ? "AR" : "AP";
      const data = await getAgingReport(actor, { type, asOf });
      const rows: Array<Array<string | number>> = [
        ["Pihak", "Belum jatuh tempo", "1-30", "31-60", "61-90", ">90", "Total"],
      ];
      for (const party of data.parties) {
        rows.push([
          party.partyName,
          party.current.toFixed(2),
          party.d1_30.toFixed(2),
          party.d31_60.toFixed(2),
          party.d61_90.toFixed(2),
          party.over90.toFixed(2),
          party.total.toFixed(2),
        ]);
      }
      rows.push([
        "TOTAL",
        data.totals.current.toFixed(2),
        data.totals.d1_30.toFixed(2),
        data.totals.d31_60.toFixed(2),
        data.totals.d61_90.toFixed(2),
        data.totals.over90.toFixed(2),
        data.totals.total.toFixed(2),
      ]);
      return csvResponse(rows, `aging-${type.toLowerCase()}-${asOf.toISOString().slice(0, 10)}.csv`);
    }
    case "tax-ppn": {
      const data = await getTaxSummary(actor, period);
      const rows: Array<Array<string | number>> = [
        ["Bagian", "Keterangan", "Jumlah"],
        ["PPN", "Keluaran", data.vat.output.toFixed(2)],
        ["PPN", "Masukan", data.vat.input.toFixed(2)],
        ["PPN", "Neto", data.vat.net.toFixed(2)],
        ["PPN", "Status", data.vatSettled ? "Selesai" : "Belum"],
      ];
      for (const row of data.pphWithheld) {
        rows.push([row.type, "Dipungut", row.withheld.toFixed(2)]);
        rows.push([row.type, "Saldo utang", row.liabilityBalance.toFixed(2)]);
      }
      return csvResponse(rows, `rekap-pajak-${period}.csv`);
    }
    case "general-ledger": {
      const accountId = url.searchParams.get("account");
      if (!accountId) return new NextResponse("Parameter akun wajib", { status: 400 });
      const first = await getLedgerReport(actor, { accountId, from, to, page: 1 });
      const rows: Array<Array<string | number>> = [
        ["Tanggal", "Jurnal", "Keterangan", "Referensi", "Debit", "Kredit", "Saldo"],
        ["", "", "Saldo awal", "", "", "", first.opening.toFixed(2)],
      ];
      for (let page = 1; page <= first.totalPages; page += 1) {
        const data = page === 1 ? first : await getLedgerReport(actor, { accountId, from, to, page });
        for (const row of data.rows) {
          rows.push([row.date, row.number, row.description, row.reference ?? "", row.debit.toFixed(2), row.credit.toFixed(2), row.balance.toFixed(2)]);
        }
      }
      rows.push(["", "", "Saldo akhir", "", "", "", first.ending.toFixed(2)]);
      return csvResponse(rows, `buku-besar-${first.account.code}-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`);
    }
    case "efaktur": {
      const invoices = await listEfakturInvoices(actor, { period });
      const rows: Array<Array<string | number>> = [
        ["Nomor faktur", "Tanggal", "Pelanggan", "NPWP", "Total", "Nomor pajak", "Tanggal pajak", "Status"],
      ];
      for (const invoice of invoices) {
        rows.push([
          invoice.number,
          invoice.date,
          invoice.customerName,
          invoice.customerNpwp ?? "",
          invoice.grandTotal.toFixed(2),
          invoice.taxInvoiceNumber ?? "",
          invoice.taxInvoiceDate ?? "",
          invoice.taxInvoiceStatus,
        ]);
      }
      return csvResponse(rows, `efaktur-${period}.csv`);
    }
    case "invoices": {
      const data = await listSalesInvoices(actor, { page: 1 });
      const rows: Array<Array<string | number>> = [
        ["Nomor", "Tanggal", "Jatuh tempo", "Pelanggan", "Status", "Total", "Dibayar", "Retur", "Sisa", "Faktur pajak"],
      ];
      for (const row of data.rows) {
        rows.push([
          row.number,
          row.date,
          row.dueDate,
          row.customerName,
          row.status,
          row.grandTotal.toFixed(2),
          row.paidAmount.toFixed(2),
          row.creditedAmount.toFixed(2),
          row.outstanding.toFixed(2),
          row.taxInvoiceStatus,
        ]);
      }
      return csvResponse(rows, `faktur-penjualan-${stamp}.csv`);
    }
    case "purchases": {
      const data = await listPurchaseInvoices(actor, { page: 1 });
      const rows: Array<Array<string | number>> = [
        ["Nomor", "Tanggal", "Jatuh tempo", "Vendor", "Status", "Total", "Dibayar", "Retur", "Sisa", "PPh"],
      ];
      for (const row of data.rows) {
        rows.push([
          row.number,
          row.date,
          row.dueDate,
          row.vendorName,
          row.status,
          row.grandTotal.toFixed(2),
          row.paidAmount.toFixed(2),
          row.creditedAmount.toFixed(2),
          row.outstanding.toFixed(2),
          row.withholdingAmount.toFixed(2),
        ]);
      }
      return csvResponse(rows, `faktur-pembelian-${stamp}.csv`);
    }
    case "assets": {
      const assets = await listFixedAssets(actor);
      const rows: Array<Array<string | number>> = [
        ["Kode", "Nama", "Kategori", "Perolehan", "Harga", "Akumulasi", "Nilai buku", "Status"],
      ];
      for (const asset of assets) {
        rows.push([
          asset.code,
          asset.name,
          asset.category,
          asset.purchaseDate,
          asset.purchasePrice.toFixed(2),
          asset.accumulatedDepreciation.toFixed(2),
          asset.bookValue.toFixed(2),
          asset.status,
        ]);
      }
      return csvResponse(rows, `register-aset-${stamp}.csv`);
    }
    case "backup": {
      const [company, accounts, journals, sales, purchases, customers, vendors, banks, assets, taxPayments, deadlines] =
        await Promise.all([
          prisma.company.findUnique({ where: { id: actor.companyId } }),
          prisma.glAccount.findMany({ where: { companyId: actor.companyId } }),
          prisma.journalEntry.findMany({
            where: { companyId: actor.companyId },
            include: { lines: true },
            orderBy: { number: "asc" },
          }),
          prisma.salesInvoice.findMany({
            where: { companyId: actor.companyId },
            include: { items: true, payments: true, creditNotes: { include: { items: true } } },
          }),
          prisma.purchaseInvoice.findMany({
            where: { companyId: actor.companyId },
            include: { items: true, payments: true, debitNotes: { include: { items: true } } },
          }),
          prisma.customer.findMany({ where: { companyId: actor.companyId } }),
          prisma.vendor.findMany({ where: { companyId: actor.companyId } }),
          prisma.bankAccount.findMany({ where: { companyId: actor.companyId } }),
          prisma.fixedAsset.findMany({ where: { companyId: actor.companyId } }),
          prisma.taxPayment.findMany({ where: { companyId: actor.companyId } }),
          prisma.companyDeadline.findMany({ where: { companyId: actor.companyId } }),
        ]);
      return jsonResponse(
        {
          exportedAt: new Date().toISOString(),
          company,
          accounts,
          journals,
          sales,
          purchases,
          customers,
          vendors,
          banks,
          assets,
          taxPayments,
          deadlines,
        },
        `fincorp-backup-${stamp}.json`,
      );
    }
    default:
      return new NextResponse("Laporan tidak ditemukan", { status: 404 });
  }
}
