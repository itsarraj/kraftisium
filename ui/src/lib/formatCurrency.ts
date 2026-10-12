/** Format Razorpay minor units (cents/paise) for display. */
export function formatPaymentAmount(amountMinor: number, currency?: string | null): string {
  const major = amountMinor / 100;
  switch ((currency ?? 'USD').toUpperCase()) {
    case 'USD':
      return `$${major.toFixed(major % 1 === 0 ? 0 : 2)}`;
    case 'INR':
      return `₹${major.toFixed(0)}`;
    case 'EUR':
      return `€${major.toFixed(0)}`;
    case 'GBP':
      return `£${major.toFixed(0)}`;
    default:
      return `${major.toFixed(2)} ${currency}`;
  }
}
