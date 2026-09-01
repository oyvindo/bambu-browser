import { cn as cnTailwindVariants, type ClassValue } from 'tailwind-variants';

export function cn(...inputs: ClassValue[]): string {
  return cnTailwindVariants(inputs) ?? '';
}

/** Safe display string for mixed JSON profile values. */
export function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value == null) return '';
  try {
    const json = JSON.stringify(value);
    return json === undefined ? '' : json;
  } catch {
    return Object.prototype.toString.call(value);
  }
}
