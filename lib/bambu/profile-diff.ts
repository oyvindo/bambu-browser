export type ProfileDiffLine = {
  kind: "unchanged" | "added" | "removed";
  text: string;
};

export type ProfileDiffSide = {
  kind: "unchanged" | "added" | "removed" | "empty";
  text: string;
};

/** One aligned row in a two-column view of the file on disk vs the editor. */
export type ProfileDiffPair = {
  left: ProfileDiffSide;
  right: ProfileDiffSide;
};

function splitLines(text: string): string[] {
  const lines = text.split("\n");
  // A trailing newline ends the last line rather than starting an empty one.
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Longest-common-subsequence lengths for every suffix pair, so the walk below
 * can prefer the path that keeps the most lines unchanged.
 */
function suffixLcsLengths(left: string[], right: string[]): Uint32Array[] {
  const table: Uint32Array[] = Array.from(
    { length: left.length + 1 },
    () => new Uint32Array(right.length + 1),
  );
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i]![j] =
        left[i] === right[j]
          ? table[i + 1]![j + 1]! + 1
          : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  return table;
}

/**
 * Line-by-line diff between the file on disk and the editor buffer.
 * Removed lines come before the added lines that replace them.
 */
export function diffProfileLines(
  original: string,
  draft: string,
): ProfileDiffLine[] {
  const before = splitLines(original);
  const after = splitLines(draft);
  const lcs = suffixLcsLengths(before, after);
  const lines: ProfileDiffLine[] = [];

  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    const atOriginalEnd = i >= before.length;
    const atDraftEnd = j >= after.length;
    if (!atOriginalEnd && !atDraftEnd && before[i] === after[j]) {
      lines.push({ kind: "unchanged", text: after[j]! });
      i += 1;
      j += 1;
    } else if (
      !atOriginalEnd &&
      (atDraftEnd || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)
    ) {
      lines.push({ kind: "removed", text: before[i]! });
      i += 1;
    } else {
      lines.push({ kind: "added", text: after[j]! });
      j += 1;
    }
  }

  return lines;
}

export function hasProfileChanges(lines: readonly ProfileDiffLine[]): boolean {
  return lines.some((line) => line.kind !== "unchanged");
}

/**
 * Fold a unified line diff into aligned pairs: a run of removals and additions
 * between unchanged lines is zipped so replacements sit on the same row.
 */
export function pairProfileDiffLines(
  lines: readonly ProfileDiffLine[],
): ProfileDiffPair[] {
  const pairs: ProfileDiffPair[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;
    if (line.kind === "unchanged") {
      pairs.push({
        left: { kind: "unchanged", text: line.text },
        right: { kind: "unchanged", text: line.text },
      });
      index += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (index < lines.length && lines[index]!.kind !== "unchanged") {
      const change = lines[index]!;
      if (change.kind === "removed") removed.push(change.text);
      else added.push(change.text);
      index += 1;
    }
    const count = Math.max(removed.length, added.length);
    for (let offset = 0; offset < count; offset += 1) {
      const leftText = removed[offset];
      const rightText = added[offset];
      pairs.push({
        left:
          leftText === undefined
            ? { kind: "empty", text: "" }
            : { kind: "removed", text: leftText },
        right:
          rightText === undefined
            ? { kind: "empty", text: "" }
            : { kind: "added", text: rightText },
      });
    }
  }
  return pairs;
}
