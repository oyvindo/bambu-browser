/**
 * Editing a PrusaSlicer user preset. PrusaSlicer stores full snapshots, so
 * the editor shows only what differs from the parent and saving rebuilds the
 * whole file from the parent plus those edits.
 */

import { buildMergedProfileData } from '@/lib/bambu/chain-display';
import type { InheritanceChainLevel } from '@/lib/bambu/resolver';

import { serializePrusaValue } from './prusa-values';

function parentAndLeaf(chain: readonly InheritanceChainLevel[]) {
  const leaf = chain.at(-1)?.data ?? {};
  const parent = chain.length > 1 ? buildMergedProfileData(chain, chain.length - 2) : {};
  return { parent, leaf };
}

/** Keys of the user preset whose written value differs from the parent's, plus `inherits`. */
export function prusaLeafOverrides(
  chain: readonly InheritanceChainLevel[],
): Record<string, unknown> {
  const { parent, leaf } = parentAndLeaf(chain);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(leaf)) {
    if (key === 'inherits') {
      out[key] = value;
      continue;
    }
    const differs =
      !Object.prototype.hasOwnProperty.call(parent, key) ||
      serializePrusaValue(key, value) !== serializePrusaValue(key, parent[key]);
    if (differs) out[key] = value;
  }
  return out;
}

/**
 * Every key PrusaSlicer expects in the file, as INI text: the parent's
 * effective values, keys only the user file had, then the editor's values.
 */
export function buildPrusaFullConfig(
  chain: readonly InheritanceChainLevel[],
  edited: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const { parent, leaf } = parentAndLeaf(chain);
  const merged: Record<string, unknown> = { ...parent };
  for (const [key, value] of Object.entries(leaf)) {
    if (!Object.prototype.hasOwnProperty.call(parent, key)) merged[key] = value;
  }
  Object.assign(merged, edited);
  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, serializePrusaValue(key, value)]),
  );
}
