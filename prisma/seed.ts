import "dotenv/config";
import { prisma, withFinancialTx, type Tx } from "@/lib/prisma";
import { createCompanyForUser } from "@/server/companies/create";
import { createCredentialUser } from "@/lib/password";
import { createCustomer } from "@/server/sales/customers";
import { createVendor } from "@/server/purchases/vendors";
import { createSalesInvoice, updateSalesTaxInvoice } from "@/server/sales/invoices";
import { recordSalesPayment } from "@/server/sales/payments";
import { createSalesCreditNote } from "@/server/sales/credit-notes";
import { createPurchaseInvoice } from "@/server/purchases/invoices";
import { recordPurchasePayment } from "@/server/purchases/payments";
import { createPurchaseDebitNote } from "@/server/purchases/debit-notes";
import { createBankAccount } from "@/server/cash/accounts";
import { createBankTransfer, createCashTransaction } from "@/server/cash/transactions";
import { createFixedAsset } from "@/server/assets/assets";
import { runDepreciation } from "@/server/assets/depreciation";
import { settlePpn, payWithholdingTax } from "@/server/tax/tax";
import { closePeriod } from "@/server/accounting/periods";
import { addDays, dateFromISO, isoFromDate, taxDueDate } from "@/lib/dates";
import { D } from "@/lib/money";
import type { Actor } from "@/lib/types";
import {
  DEMO_ASSETS,
  DEMO_BANKS,
  DEMO_COMPANY,
  DEMO_CUSTOMERS,
  DEMO_MONTHLY_CASH,
  DEMO_PURCHASES,
  DEMO_SALES,
  DEMO_USERS,
  DEMO_VENDORS,
} from "@/server/demo/seed-fixtures";
import { verifyLedger } from "@/server/demo/verify";

const TABLES = [
  "SupportMessage",
  "SupportTicket",
  "AlertDismissal",
  "AuditLog",
  "CompanyDeadline",
  "TaxPayment",
  "DepreciationEntry",
  "DepreciationRun",
  "FixedAsset",
  "BankStatementLine",
  "BankTransfer",
  "CashTransaction",
  "BankAccount",
  "PurchaseDebitNoteItem",
  "PurchaseDebitNote",
  "PurchasePayment",
  "PurchaseInvoiceItem",
  "PurchaseInvoice",
  "Vendor",
  "SalesCreditNoteItem",
  "SalesCreditNote",
  "SalesPayment",
  "SalesInvoiceItem",
  "SalesInvoice",
  "Customer",
  "JournalLine",
  "JournalEntry",
  "DocumentCounter",
  "FiscalPeriod",
  "GlAccount",
  "CompanyMember",
  "Company",
  "Account",
  "Session",
  "Verification",
  "User",
];

async function truncateAll(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE;`);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed demo tidak boleh dijalankan di production.");
  }

  console.log("• Membersihkan database…");
  await truncateAll();

  console.log("• Membuat pengguna demo…");
  const users = [];
  for (const user of DEMO_USERS) {
    const created = await createCredentialUser(prisma as unknown as Tx, user);
    users.push(created);
  }
  const [admin, accountant, viewer] = users;

  console.log("• Membuat perusahaan, COA, dan rekening…");
  const company = await createCompanyForUser(prisma as unknown as Tx, admin.id, {
    ...DEMO_COMPANY,
    pkpDate: dateFromISO(DEMO_COMPANY.pkpDate),
  });
  await prisma.companyMember.createMany({
    data: [
      { companyId: company.companyId, userId: accountant.id, role: "ACCOUNTANT" },
      { companyId: company.companyId, userId: viewer.id, role: "VIEWER" },
    ],
  });

  const actor: Actor = { userId: admin.id, companyId: company.companyId, role: "ADMIN" };
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: company.companyId },
    select: { id: true, code: true },
  });
  const accountId = new Map(accounts.map((account) => [account.code, account.id]));
  const requireAccount = (code: string): string => {
    const id = accountId.get(code);
    if (!id) throw new Error(`Akun ${code} tidak ditemukan.`);
    return id;
  };

  const banks = new Map<string, { id: string; coaAccountId: string }>();
  for (const bank of DEMO_BANKS) {
    const created = await createBankAccount(actor, {
      name: bank.name,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      type: bank.type,
      openingBalance: bank.openingBalance,
      openingDate: dateFromISO("2026-01-01"),
      cardTheme: bank.cardTheme,
      coaAccountId: requireAccount(bank.coaCode),
    });
    banks.set(bank.name, { id: created.id, coaAccountId: requireAccount(bank.coaCode) });
  }
  const bca = banks.get("Bank BCA")!;
  const mandiri = banks.get("Bank Mandiri")!;

  console.log("• Membuat pelanggan dan vendor…");
  const customers = new Map<string, string>();
  for (const customer of DEMO_CUSTOMERS) {
    const created = await withFinancialTx((tx) => createCustomer(tx, actor, customer));
    customers.set(customer.name, created.id);
  }
  const vendors = new Map<string, string>();
  for (const vendor of DEMO_VENDORS) {
    const created = await withFinancialTx((tx) => createVendor(tx, actor, vendor));
    vendors.set(vendor.name, created.id);
  }

  console.log("• Membuat faktur penjualan dan pembayaran…");
  const salesInvoices: Array<{ id: string; date: Date; dueDate: Date; total: number }> = [];
  for (const spec of DEMO_SALES) {
    const date = dateFromISO(spec.date);
    const dueDate = addDays(date, 14);
    const created = await createSalesInvoice(
      actor,
      {
        customerId: customers.get(spec.customer)!,
        revenueAccountId: requireAccount(spec.revenueCode),
        date,
        dueDate,
        ppnRate: "11",
        items: spec.items,
        paymentTerms: "NET 14",
      },
      spec.draft ? "draft" : "post",
    );
    const invoice = await prisma.salesInvoice.findUniqueOrThrow({ where: { id: created.id } });
    salesInvoices.push({
      id: created.id,
      date,
      dueDate,
      total: D(invoice.grandTotal).toNumber(),
    });
    if (spec.draft) continue;

    if (spec.paid === "full" || spec.paid !== "none") {
      const amount = spec.paid === "full" ? D(invoice.grandTotal) : D(spec.paid);
      if (amount.greaterThan(0)) {
        await recordSalesPayment(actor, {
          invoiceId: created.id,
          bankAccountId: bca.id,
          date: addDays(date, 5),
          amount: amount.toFixed(2),
          reference: `INV-${created.number}`,
        });
      }
    }

    if (spec.taxStatus) {
      const taxDate = addDays(date, 1);
      await updateSalesTaxInvoice(actor, {
        invoiceId: created.id,
        status: "SUBMITTED",
        number: spec.taxNumber,
        date: taxDate,
      });
      if (spec.taxStatus === "APPROVED") {
        await updateSalesTaxInvoice(actor, {
          invoiceId: created.id,
          status: "APPROVED",
          number: spec.taxNumber,
          date: taxDate,
        });
      }
    }
  }

  const invoice8 = await prisma.salesInvoice.findFirstOrThrow({
    where: { companyId: actor.companyId, number: "INV/2026/0008" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const invoice8DocItem = invoice8.items.find((item) => item.description === "Biaya dokumentasi") ?? invoice8.items[0];
  await createSalesCreditNote(actor, {
    invoiceId: invoice8.id,
    date: dateFromISO("2026-05-02"),
    reason: "Pengurangan lingkup integrasi",
    items: [{ invoiceItemId: invoice8DocItem.id, quantity: "1" }],
  });

  console.log("• Membuat faktur pembelian dan pembayaran…");
  const purchaseInvoices: Array<{ id: string }> = [];
  for (const spec of DEMO_PURCHASES) {
    const date = dateFromISO(spec.date);
    const dueDate = addDays(date, spec.dueDays ?? 30);
    const created = await createPurchaseInvoice(
      actor,
      {
        vendorId: vendors.get(spec.vendor)!,
        date,
        dueDate,
        ppnRate: "11",
        withholdingType: spec.withholdingType,
        withholdingRate: spec.withholdingRate,
        items: spec.items.map((item) => ({ ...item, accountId: requireAccount(item.accountCode) })),
      },
      spec.draft ? "draft" : "post",
    );
    purchaseInvoices.push({ id: created.id });
    if (spec.draft) continue;
    if (spec.paid === "full" || spec.paid !== "none") {
      const invoice = await prisma.purchaseInvoice.findUniqueOrThrow({ where: { id: created.id } });
      const amount = spec.paid === "full" ? D(invoice.grandTotal) : D(spec.paid);
      if (amount.greaterThan(0)) {
        await recordPurchasePayment(actor, {
          invoiceId: created.id,
          bankAccountId: bca.id,
          date: addDays(date, 7),
          amount: amount.toFixed(2),
          reference: `PUR-${created.number}`,
        });
      }
    }
  }

  const purchase8 = await prisma.purchaseInvoice.findFirstOrThrow({
    where: { companyId: actor.companyId, number: "PUR/2026/0008" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  await createPurchaseDebitNote(actor, {
    invoiceId: purchase8.id,
    date: dateFromISO("2026-10-01"),
    reason: "Spesifikasi tidak sesuai",
    items: [{ invoiceItemId: purchase8.items[0].id, quantity: "1" }],
  });

  console.log("• Mencatat transaksi kas rutin…");
  for (let month = 1; month <= 10; month += 1) {
    for (const rule of DEMO_MONTHLY_CASH) {
      await createCashTransaction(actor, {
        bankAccountId: bca.id,
        date: new Date(Date.UTC(2026, month - 1, rule.day)),
        description: rule.description,
        category: rule.category,
        amount: rule.amount,
        direction: rule.direction,
        counterAccountId: requireAccount(rule.counterCode),
      });
    }
  }
  await createCashTransaction(actor, {
    bankAccountId: bca.id,
    date: dateFromISO("2026-06-30"),
    description: "Bunga giro",
    category: "Pendapatan bunga",
    amount: "250000",
    direction: "IN",
    counterAccountId: requireAccount("4130"),
  });
  await createBankTransfer(actor, {
    fromAccountId: bca.id,
    toAccountId: mandiri.id,
    date: dateFromISO("2026-03-20"),
    amount: "50000000",
    description: "Pindah dana ke Mandiri",
  });

  console.log("• Mencatat aset tetap dan penyusutan…");
  for (const asset of DEMO_ASSETS) {
    await createFixedAsset(actor, {
      code: asset.code,
      name: asset.name,
      category: asset.category,
      purchaseDate: dateFromISO(asset.purchaseDate),
      purchasePrice: asset.purchasePrice,
      residualValue: asset.residualValue,
      usefulLifeMonths: asset.usefulLifeMonths,
      method: asset.method,
      annualRate: asset.annualRate,
      assetAccountId: requireAccount(asset.assetCode),
      accumulatedAccountId: requireAccount(asset.accumulatedCode),
      depreciationExpenseAccountId: requireAccount(asset.expenseCode),
      fundingType: "BANK",
      fundingAccountId: bca.id,
    });
  }
  await prisma.documentCounter.upsert({
    where: { companyId_key: { companyId: actor.companyId, key: "ASSET" } },
    create: { companyId: actor.companyId, key: "ASSET", value: 4 },
    update: { value: 4 },
  });
  for (let month = 1; month <= 10; month += 1) {
    await runDepreciation(actor, `2026-${String(month).padStart(2, "0")}`);
  }

  console.log("• Menyelesaikan pajak…");
  for (const period of ["2026-01", "2026-02", "2026-03"]) {
    await settlePpn(actor, {
      period,
      bankAccountId: bca.id,
      paymentDate: taxDueDate("PPN", period),
    });
  }
  const pphPayments = [
    { type: "PPH23" as const, period: "2026-02", amount: "90000" },
    { type: "PPH23" as const, period: "2026-07", amount: "240000" },
    { type: "PPH23" as const, period: "2026-10", amount: "115000" },
    { type: "PPH4_2" as const, period: "2026-04", amount: "3000000" },
  ];
  for (const payment of pphPayments) {
    await payWithholdingTax(actor, {
      ...payment,
      bankAccountId: bca.id,
      paymentDate: taxDueDate(payment.type, payment.period),
    });
  }

  console.log("• Menyiapkan rekonsiliasi bank…");
  const invoice15 = await prisma.salesInvoice.findFirstOrThrow({
    where: { companyId: actor.companyId, number: "INV/2026/0015" },
  });
  const payment15 = await prisma.salesPayment.findFirstOrThrow({
    where: { invoiceId: invoice15.id, voidedAt: null },
    include: { invoice: { select: { number: true } } },
  });
  const paymentLine = await prisma.journalLine.findFirstOrThrow({
    where: {
      journalEntryId: payment15.journalEntryId,
      accountId: bca.coaAccountId,
      debit: { gt: 0 },
    },
  });
  const adminTx = await prisma.cashTransaction.findFirstOrThrow({
    where: { companyId: actor.companyId, description: "Administrasi bank", date: dateFromISO("2026-10-28") },
  });
  const adminLine = await prisma.journalLine.findFirstOrThrow({
    where: { journalEntryId: adminTx.journalEntryId, accountId: bca.coaAccountId, credit: { gt: 0 } },
  });
  await prisma.bankStatementLine.createMany({
    data: [
      {
        companyId: actor.companyId,
        bankAccountId: bca.id,
        date: payment15.date,
        description: "Transfer masuk klien",
        reference: "INV/2026/0015",
        amount: D(payment15.amount).toFixed(2),
        status: "MATCHED",
        matchedJournalLineId: paymentLine.id,
      },
      {
        companyId: actor.companyId,
        bankAccountId: bca.id,
        date: adminTx.date,
        description: "Biaya administrasi bank",
        reference: null,
        amount: "-150000",
        status: "MATCHED",
        matchedJournalLineId: adminLine.id,
      },
      {
        companyId: actor.companyId,
        bankAccountId: bca.id,
        date: dateFromISO("2026-10-30"),
        description: "Bunga giro",
        reference: null,
        amount: "1234000",
        status: "UNMATCHED",
      },
      {
        companyId: actor.companyId,
        bankAccountId: bca.id,
        date: dateFromISO("2026-10-29"),
        description: "Pembayaran vendor",
        reference: "VB-77",
        amount: "-2500000",
        status: "UNMATCHED",
      },
    ],
  });

  console.log("• Membuat tiket bantuan dan tenggat manual…");
  await prisma.supportTicket.create({
    data: {
      companyId: actor.companyId,
      userId: admin.id,
      number: "TKT/2026/0001",
      subject: "Rekonsiliasi bank April",
      category: "ACCOUNTING",
      priority: "NORMAL",
      status: "OPEN",
      description: "Selisih rekonsiliasi bank April perlu diperiksa sebelum tutup buku.",
    },
  });
  await prisma.documentCounter.upsert({
    where: { companyId_key: { companyId: actor.companyId, key: "SUPPORT_TICKET" } },
    create: { companyId: actor.companyId, key: "SUPPORT_TICKET", value: 1 },
    update: { value: 1 },
  });
  await prisma.companyDeadline.create({
    data: {
      companyId: actor.companyId,
      title: "Laporan bulanan November",
      dueDate: dateFromISO("2026-12-05"),
      category: "OTHER",
      notes: "Kirim laporan ke manajemen",
      createdById: admin.id,
    },
  });

  console.log("• Menutup periode Januari–September…");
  for (let month = 1; month <= 9; month += 1) {
    await closePeriod(actor, { year: 2026, month });
  }

  console.log("• Memverifikasi buku besar…");
  await verifyLedger(company.companyId);

  console.log(`SEED OK — ${isoFromDate(dateFromISO("2026-11-15"))} · ${DEMO_COMPANY.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
