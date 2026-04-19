/** Allowed lengths for manual entry (EAN-8, UPC-A / GTIN-12, EAN-13, GTIN-14). */
export const MANUAL_BARCODE_LENGTHS: readonly number[] = [8, 12, 13, 14];

/** Strip non-digits (spaces, dashes, paste noise). */
export function digitsOnlyFromBarcodeInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidManualBarcodeDigits(digits: string): boolean {
  if (digits.length === 0 || !/^\d+$/.test(digits)) {
    return false;
  }
  return MANUAL_BARCODE_LENGTHS.includes(digits.length);
}
