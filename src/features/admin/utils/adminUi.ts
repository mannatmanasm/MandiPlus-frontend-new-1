export const ADMIN_BRAND_PURPLE = '#4309ac';

export const adminButtonClasses = {
  primary:
    'inline-flex items-center justify-center rounded-lg border border-[#4309ac]/20 bg-[#4309ac] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4309ac]/90 focus:outline-none focus:ring-2 focus:ring-[#4309ac] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'inline-flex items-center justify-center rounded-lg border border-[#4309ac]/20 bg-white px-4 py-2 text-sm font-semibold text-[#4309ac] hover:bg-[#4309ac]/10 focus:outline-none focus:ring-2 focus:ring-[#4309ac] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4309ac] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
};

export const adminChipClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function adminStatusChipVariant(status: string): keyof typeof adminChipClasses {
  const s = (status || '').toLowerCase();

  if (s === 'completed' || s === 'success' || s === 'verified' || s === 'approved') return 'success';
  if (s === 'pending' || s === 'inprogress' || s === 'in_progress' || s === 'processing') return 'pending';

  return 'info';
}
