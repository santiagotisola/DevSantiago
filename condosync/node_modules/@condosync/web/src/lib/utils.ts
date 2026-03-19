import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return formatDate(d);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) return 'Telefone inválido. Use (XX) XXXXX-XXXX';
  return null;
}

export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function validateCPF(cpf: string): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return 'CPF inválido. Use XXX.XXX.XXX-XX';
  if (/^(\d)\1{10}$/.test(digits)) return 'CPF inválido';
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return 'CPF inválido';
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[10])) return 'CPF inválido';
  return null;
}

export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function validateCNPJ(cnpj: string): string | null {
  if (!cnpj) return null;
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return 'CNPJ inválido. Use XX.XXX.XXX/XXXX-XX';
  if (/^(\d)\1{13}$/.test(digits)) return 'CNPJ inválido';
  const calc = (d: string, weights: number[]) =>
    d.split('').reduce((sum, n, i) => sum + parseInt(n) * weights[i], 0);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(digits.slice(0, 12), w1) % 11;
  if ((r1 < 2 ? 0 : 11 - r1) !== parseInt(digits[12])) return 'CNPJ inválido';
  const r2 = calc(digits.slice(0, 13), w2) % 11;
  if ((r2 < 2 ? 0 : 11 - r2) !== parseInt(digits[13])) return 'CNPJ inválido';
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'E-mail inválido';
  return null;
}

export function validateName(name: string): string | null {
  if (!name || name.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
  return null;
}
