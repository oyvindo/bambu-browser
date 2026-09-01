'use client';

import * as React from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False while rendering on the server and during hydration, true afterwards.
 * Use to gate browser-only values without causing a hydration mismatch.
 */
export function useIsHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
