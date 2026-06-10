// ============================================================================
// FinCorp Indonesia - Company & User Mock Data
// ============================================================================

import type { Company, User } from './types';

export const company: Company = {
  id: 'comp-001',
  name: 'PT FinCorp Indonesia Makmur Jaya',
  npwp: '01.234.567.8-901.000',
  nib: '9120391283091',
  pkpNumber: '01.234.567.8-901.000',
  pkpDate: '2015-08-15',
  address: 'Gedung Keuangan Tower Lt. 14, Jl. Jend. Sudirman Kav. 50, Jakarta Pusat, DKI Jakarta 10220',
  email: 'finance@fincorp.co.id',
  phone: '(021) 555-1234',
  kpp: 'KPP Pratama Jakarta Setiabudi Dua',
  isPkpActive: true,
  fiscalYearStart: 1, // January
};

export const currentUser: User = {
  id: 'user-001',
  name: 'Budi Santoso',
  email: 'budi.santoso@fincorp.co.id',
  role: 'ADMIN',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
};

export const users: User[] = [
  currentUser,
  {
    id: 'user-002',
    name: 'Siti Rahayu',
    email: 'siti.rahayu@fincorp.co.id',
    role: 'ACCOUNTANT',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  },
  {
    id: 'user-003',
    name: 'Ahmad Wijaya',
    email: 'ahmad.wijaya@fincorp.co.id',
    role: 'VIEWER',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  },
];