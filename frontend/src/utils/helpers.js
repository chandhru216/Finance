import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy');
};

export const formatDateShort = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM');
};

export const formatMonthYear = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'MMM yyyy');
};

export const timeAgo = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const LOAN_TYPES = {
  education: { label: 'Education', icon: '🎓', color: 'blue' },
  business: { label: 'Business', icon: '💼', color: 'purple' },
  personal: { label: 'Personal', icon: '👤', color: 'accent' },
  home: { label: 'Home', icon: '🏠', color: 'green' },
  vehicle: { label: 'Vehicle', icon: '🚗', color: 'yellow' },
  medical: { label: 'Medical', icon: '🏥', color: 'red' },
  other: { label: 'Other', icon: '📋', color: 'orange' },
};

export const EXPENSE_CATEGORIES = {
  food: { label: 'Food & Dining', icon: '🍽️', color: '#f97316' },
  travel: { label: 'Travel', icon: '✈️', color: '#06b6d4' },
  fees: { label: 'Fees & Tuition', icon: '📚', color: '#6c63ff' },
  accommodation: { label: 'Accommodation', icon: '🏨', color: '#10b981' },
  books: { label: 'Books & Stationery', icon: '📖', color: '#8b5cf6' },
  equipment: { label: 'Equipment', icon: '💻', color: '#3b82f6' },
  medical: { label: 'Medical', icon: '💊', color: '#ef4444' },
  utilities: { label: 'Utilities', icon: '💡', color: '#f59e0b' },
  entertainment: { label: 'Entertainment', icon: '🎬', color: '#ec4899' },
  clothing: { label: 'Clothing', icon: '👗', color: '#14b8a6' },
  groceries: { label: 'Groceries', icon: '🛒', color: '#84cc16' },
  other: { label: 'Other', icon: '📦', color: '#6b7280' },
};

export const getUtilizationColor = (percent) => {
  if (percent >= 100) return 'var(--red)';
  if (percent >= 80) return 'var(--yellow)';
  if (percent >= 60) return 'var(--orange)';
  return 'var(--green)';
};

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
