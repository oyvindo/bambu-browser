import { cn as cnTailwindVariants, type ClassValue } from 'tailwind-variants';

export function cn(...inputs: ClassValue[]): string {
  return cnTailwindVariants(inputs) ?? '';
}
