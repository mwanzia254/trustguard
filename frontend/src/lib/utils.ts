import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTrustLabel(score: number): string {
  if (score >= 86) return 'TRUSTED';
  if (score >= 61) return 'GOOD';
  if (score >= 31) return 'CAUTION';
  return 'HIGH RISK';
}

export function getTrustStatus(score: number): string {
  if (score >= 86) return 'trusted';
  if (score >= 61) return 'good';
  if (score >= 31) return 'caution';
  return 'high_risk';
}

export function getTrustColor(score: number): string {
  if (score >= 86) return 'text-green-600';
  if (score >= 61) return 'text-blue-600';
  if (score >= 31) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatCurrency(amount: number, currency = 'KES'): string {
  return `${currency} ${amount.toLocaleString('en-KE')}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export const REPORT_CATEGORIES = [
  { value: 'fake_product',    label: 'Fake Product / Wrong Item' },
  { value: 'no_delivery',     label: 'No Delivery / Non-Receipt' },
  { value: 'fake_business',   label: 'Fake Business / Ghost Shop' },
  { value: 'payment_fraud',   label: 'Payment Fraud / M-Pesa Scam' },
  { value: 'identity_theft',  label: 'Identity Theft / Impersonation' },
  { value: 'fake_account',    label: 'Fake Account / Catfishing' },
  { value: 'romance_scam',    label: 'Romance Scam' },
  { value: 'job_scam',        label: 'Fake Job / Investment Scam' },
  { value: 'other',           label: 'Other Fraud' },
];

export const SEARCH_TYPES = [
  { value: 'phone',         label: 'Phone Number',       icon: '📱' },
  { value: 'till_number',   label: 'Till Number',        icon: '🏪' },
  { value: 'paybill',       label: 'Paybill Number',     icon: '🏦' },
  { value: 'business_name', label: 'Business Name',      icon: '🏢' },
  { value: 'tiktok',        label: 'TikTok Account',     icon: '🎵' },
  { value: 'social_media',  label: 'Social Media Handle',icon: '📲' },
  { value: 'website',       label: 'Website',            icon: '🌐' },
];
