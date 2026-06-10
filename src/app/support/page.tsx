'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  date: string;
}

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const defaultFaqs: FaqItem[] = [
  {
    q: 'Bagaimana cara melakukan penutupan buku bulanan?',
    a: 'Anda dapat membuka menu Akuntansi (Dashboard Akuntansi), lalu ikuti panduan langkah checklist penutupan buku di panel kanan. Lakukan depresiasi aset bulanan dan rekonsiliasi kas sebelum menekan tombol "Tutup Buku Sekarang".',
    category: 'Akuntansi & Ledger'
  },
  {
    q: 'Mengapa sinkronisasi e-Faktur saya gagal dengan kode Error 403?',
    a: 'Error 403 biasanya disebabkan oleh sertifikat elektronik (sertel) DJP yang kedaluwarsa atau passphrase jatah NSFP yang salah. Harap unggah ulang sertel aktif dan perbarui passphrase Anda di menu Pengaturan Pajak.',
    category: 'Perpajakan'
  },
  {
    q: 'Bagaimana cara mengekspor laporan keuangan ke format Excel/CSV?',
    a: 'Buka menu Laporan Keuangan, klik tombol pratinjau (ikon mata) pada laporan yang Anda inginkan (seperti Neraca Saldo atau Arus Kas), kemudian tekan tombol "Ekspor Excel / CSV" di sudut kiri bawah modal pratinjau.',
    category: 'Laporan Keuangan'
  },
  {
    q: 'Apakah saldo rekening kas berkurang otomatis saat melunasi faktur pembelian?',
    a: 'Ya, mencatat pembayaran faktur pembelian berstatus UNPAID/OVERDUE akan secara otomatis memotong saldo rekening bank operasional yang Anda pilih dan membukukan mutasi kas keluar di Buku Besar.',
    category: 'Kas & Bank'
  },
  {
    q: 'Bagaimana cara memulihkan data dari berkas backup?',
    a: 'Buka menu Pengaturan, pilih tab "Backup & Restore Data", unggah file backup JSON FinCorp Anda pada bagian "Restore Data", lalu klik "Pulihkan Data". Sistem akan memverifikasi dan memuat ulang database.',
    category: 'Pengaturan'
  }
];

const defaultTickets: SupportTicket[] = [
  {
    id: 'TKT-2026-042',
    subject: 'Gagal Sinkronisasi e-Faktur Pajak Masukan (Error 403)',
    category: 'Perpajakan',
    priority: 'HIGH',
    description: 'Saat melakukan impor sertifikat elektronik baru, muncul pesan error 403 Forbidden dari server DJP.',
    status: 'RESOLVED',
    date: '08 Jun 2026'
  },
  {
    id: 'TKT-2026-057',
    subject: 'Penyesuaian Akumulasi Depresiasi Kendaraan Operasional',
    category: 'Aset Tetap',
    priority: 'MEDIUM',
    description: 'Nilai buku bersih kendaraan dinas pada laporan depresiasi bulanan tidak berkurang sesuai perhitungan straight line.',
    status: 'IN_PROGRESS',
    date: '10 Jun 2026'
  }
];

export default function SupportPage() {
  const { showToast } = useApp();
  // Search & Accordion states
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Tickets List states
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>([]);

  // Form states
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Akuntansi');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [ticketDescription, setTicketDescription] = useState('');

  // Load and save tickets in localStorage
  useEffect(() => {
    const storedTickets = localStorage.getItem('fincorp_tickets');
    if (storedTickets) {
      setTicketsList(JSON.parse(storedTickets));
    } else {
      setTicketsList(defaultTickets);
      localStorage.setItem('fincorp_tickets', JSON.stringify(defaultTickets));
    }
  }, []);

  // Submit support ticket form
  const handleSaveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDescription) {
      showToast('Mohon lengkapi subjek dan deskripsi kendala.', 'warning');
      return;
    }

    const newTicket: SupportTicket = {
      id: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
      subject: ticketSubject,
      category: ticketCategory,
      priority: ticketPriority,
      description: ticketDescription,
      status: 'PENDING',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    const updatedTickets = [newTicket, ...ticketsList];
    setTicketsList(updatedTickets);
    localStorage.setItem('fincorp_tickets', JSON.stringify(updatedTickets));

    // Reset Form
    setTicketSubject('');
    setTicketDescription('');
    setTicketPriority('MEDIUM');
    setTicketCategory('Akuntansi');
    
    showToast(`Tiket Bantuan "${newTicket.id}" berhasil dikirim! Tim Technical Support akan menindaklanjuti kendala Anda.`, 'success');
  };

  // Filter FAQs based on search query
  const filteredFaqs = useMemo(() => {
    return defaultFaqs.filter(faq => 
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const toggleFaq = (index: number) => {
    if (expandedFaqIndex === index) {
      setExpandedFaqIndex(null);
    } else {
      setExpandedFaqIndex(index);
    }
  };

  return (
    <Layout showSearch={false}>
      <div className="space-y-6 animate-slide-up pb-10">
        
        {/* Page Header */}
        <PageHeader
          title="Pusat Bantuan & Dukungan"
          description="Pusat bantuan pengguna FinCorp. Temukan solusi dari FAQ, ajukan tiket kendala teknis, atau hubungi support representative kami."
        />

        {/* Search Bar Banner (Wow Factor) */}
        <div className="glass-card p-6 rounded-2xl border border-border-subtle/50 bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent flex flex-col items-center text-center space-y-4">
          <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-black">Bagaimana kami bisa membantu Anda hari ini?</h3>
          <div className="relative w-full max-w-xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              className="w-full pl-12 pr-4 py-3 border border-border-subtle focus:border-secondary/50 focus:ring-2 focus:ring-secondary/15 rounded-2xl font-body-md text-sm bg-surface-container-low text-on-surface outline-none shadow-md transition-all"
              placeholder="Cari solusi kendala (misal: e-Faktur, depresiasi, ekspor)..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Double Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: FAQ & My Tickets */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* FAQ Accordions */}
            <div className="glass-card p-6 rounded-2xl border border-border-subtle/50 space-y-4">
              <div className="flex items-center gap-2 border-b border-border-subtle/40 pb-3">
                <span className="material-symbols-outlined text-secondary">help</span>
                <h3 className="font-bold text-primary dark:text-secondary-container">Tanya Jawab Terpopuler (FAQ)</h3>
              </div>

              <div className="divide-y divide-border-subtle/20">
                {filteredFaqs.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic py-4">Tidak ada tanya jawab yang cocok dengan pencarian Anda.</p>
                ) : (
                  filteredFaqs.map((faq, index) => (
                    <div key={index} className="py-3.5">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex justify-between items-center text-left text-xs font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[8.5px] bg-primary/10 text-primary rounded uppercase tracking-wider">{faq.category}</span>
                          {faq.q}
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-outline transition-transform duration-200" style={{ transform: expandedFaqIndex === index ? 'rotate(180deg)' : 'rotate(0)' }}>
                          expand_more
                        </span>
                      </button>
                      
                      {expandedFaqIndex === index && (
                        <div className="mt-2 text-xs text-on-surface-variant leading-relaxed p-3.5 bg-white/40 dark:bg-black/15 border border-border-subtle/35 rounded-xl animate-fade-in">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* My Tickets List */}
            <div className="glass-card p-6 rounded-2xl border border-border-subtle/50 space-y-4">
              <div className="flex items-center gap-2 border-b border-border-subtle/40 pb-3">
                <span className="material-symbols-outlined text-secondary">confirmation_number</span>
                <h3 className="font-bold text-primary dark:text-secondary-container">Riwayat Tiket Bantuan Saya</h3>
              </div>

              {/* Tickets Table */}
              <div className="overflow-x-auto border border-border-subtle/50 rounded-xl">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead className="bg-surface-container-low/50 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                    <tr className="h-10">
                      <th className="py-2 px-3 font-semibold">ID Tiket</th>
                      <th className="py-2 px-3 font-semibold">Subjek Kendala</th>
                      <th className="py-2 px-3 font-semibold">Kategori</th>
                      <th className="py-2 px-3 font-semibold text-center">Prioritas</th>
                      <th className="py-2 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/30 text-on-surface font-body-sm font-tabular-nums">
                    {ticketsList.map((t) => (
                      <tr key={t.id} className="hover:bg-primary/[0.01] transition-colors h-11">
                        <td className="py-2 px-3 font-bold text-primary">{t.id}</td>
                        <td className="py-2 px-3">
                          <p className="font-bold truncate max-w-xs text-on-surface" title={t.description}>{t.subject}</p>
                          <span className="text-[10px] text-outline">{t.date}</span>
                        </td>
                        <td className="py-2 px-3 text-on-surface-variant font-medium">{t.category}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                            t.priority === 'CRITICAL'
                              ? 'bg-red-500/10 text-red-500'
                              : t.priority === 'HIGH'
                              ? 'bg-danger-liability/10 text-danger-liability'
                              : t.priority === 'MEDIUM'
                              ? 'bg-warning-deadline/10 text-warning-deadline'
                              : 'bg-success-positive/10 text-success-positive'
                          }`}>{t.priority}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1 ${
                            t.status === 'RESOLVED'
                              ? 'bg-success-positive/10 text-success-positive'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-warning-deadline/10 text-warning-deadline'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${
                              t.status === 'RESOLVED'
                                ? 'bg-success-positive'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-warning-deadline animate-pulse'
                                : 'bg-primary animate-pulse'
                            }`}></span>
                            {t.status === 'RESOLVED' ? 'Selesai' : t.status === 'IN_PROGRESS' ? 'Diproses' : 'Menunggu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ticketsList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center italic text-on-surface-variant">Belum ada tiket bantuan yang diajukan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: Support Form & Contacts */}
          <div className="space-y-6">
            
            {/* Ticket Submission Form */}
            <div className="glass-card p-5 rounded-2xl border border-border-subtle/50">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-4 border-b border-border-subtle/40 pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined">send</span>
                Kirim Tiket Bantuan
              </h3>

              <form onSubmit={handleSaveTicket} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Subjek Kendala</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gagal Impor SPT PPN"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md text-on-surface-variant font-bold">Kategori</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full h-9 px-2 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface cursor-pointer font-semibold"
                    >
                      <option value="Akuntansi">Akuntansi</option>
                      <option value="Kas & Bank">Kas & Bank</option>
                      <option value="Perpajakan">Perpajakan</option>
                      <option value="Aset Tetap">Aset Tetap</option>
                      <option value="Sistem / Pengaturan">Sistem / Akun</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md text-on-surface-variant font-bold">Prioritas</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                      className="w-full h-9 px-2 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface cursor-pointer font-semibold"
                    >
                      <option value="LOW">Rendah</option>
                      <option value="MEDIUM">Sedang</option>
                      <option value="HIGH">Tinggi</option>
                      <option value="CRITICAL">Mendesak</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Deskripsi Kendala</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Jelaskan secara detail masalah yang Anda alami, serta langkah sebelum kendala tersebut muncul..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    className="w-full p-2.5 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    className="bg-gradient-secondary-premium text-white hover:shadow-lg w-full"
                  >
                    Kirim Tiket Bantuan
                  </Button>
                </div>
              </form>
            </div>

            {/* Direct Support Channels */}
            <div className="glass-card p-5 rounded-2xl border border-border-subtle/50 space-y-4">
              <h3 className="font-bold text-primary dark:text-secondary-container text-xs uppercase tracking-wider border-b border-border-subtle/40 pb-2">Kontak Dukungan Langsung</h3>
              
              <div className="space-y-3">
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 rounded-xl transition-all cursor-pointer group text-xs text-on-surface"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[20px]">chat</span>
                    <div>
                      <p className="font-bold text-emerald-600 dark:text-emerald-300">WhatsApp Support Representative</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Senin - Jumat | Pukul 09:00 - 17:00 WIB</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-500 group-hover:translate-x-0.5 transition-transform text-[16px]">chevron_right</span>
                </a>

                <a
                  href="mailto:support@fincorp.co.id"
                  className="flex items-center justify-between p-3 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/25 rounded-xl transition-all cursor-pointer group text-xs text-on-surface"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500 text-[20px]">mail</span>
                    <div>
                      <p className="font-bold text-indigo-600 dark:text-indigo-300">Official Support Mailbox</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">support@fincorp.co.id</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-indigo-500 group-hover:translate-x-0.5 transition-transform text-[16px]">chevron_right</span>
                </a>
              </div>
            </div>

            {/* System Diagnostics */}
            <div className="glass-card p-5 rounded-2xl border border-border-subtle/50 space-y-3">
              <h3 className="font-bold text-primary dark:text-secondary-container text-xs uppercase tracking-wider border-b border-border-subtle/40 pb-2">Diagnostik Sistem</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Server Status</span>
                  <span className="flex items-center gap-1 text-success-positive font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-positive animate-pulse"></span>
                    Online
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Latensi API e-Faktur</span>
                  <span className="font-bold text-on-surface font-tabular-nums">42 ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Koneksi Database</span>
                  <span className="font-bold text-success-positive">Terhubung (Secured)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Versi FinCorp Suite</span>
                  <span className="font-bold text-on-surface font-tabular-nums">v1.2.0</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </Layout>
  );
}
