import { describe, expect, it } from 'vite-plus/test';

import { diffProfileLines, hasProfileChanges, pairProfileDiffLines } from './profile-diff';

function render(original: string, draft: string): string[] {
  return diffProfileLines(original, draft).map(
    ({ kind, text }) => `${kind === 'added' ? '+' : kind === 'removed' ? '-' : ' '}${text}`,
  );
}

describe('profile line diff', () => {
  it('reports no changes for identical text', () => {
    const lines = diffProfileLines('a\nb\n', 'a\nb\n');
    expect(hasProfileChanges(lines)).toBe(false);
    expect(lines.map((line) => line.text)).toEqual(['a', 'b']);
  });

  it('marks a replaced line as removed then added', () => {
    expect(
      render('{\n    "layer_height": "0.2"\n}\n', '{\n    "layer_height": "0.3"\n}\n'),
    ).toEqual([' {', '-    "layer_height": "0.2"', '+    "layer_height": "0.3"', ' }']);
  });

  it('keeps surrounding lines unchanged when a line is inserted', () => {
    expect(render('a\nc\n', 'a\nb\nc\n')).toEqual([' a', '+b', ' c']);
  });

  it('marks a deleted line', () => {
    expect(render('a\nb\nc\n', 'a\nc\n')).toEqual([' a', '-b', ' c']);
  });

  it('handles an empty original and an empty draft', () => {
    expect(render('', 'a\n')).toEqual(['-', '+a']);
    expect(render('a\n', '')).toEqual(['-a', '+']);
  });

  it('does not treat a trailing newline as a changed line', () => {
    expect(hasProfileChanges(diffProfileLines('a\n', 'a'))).toBe(false);
  });
});

describe('profile side-by-side pairs', () => {
  it('keeps identical lines on both sides', () => {
    expect(pairProfileDiffLines(diffProfileLines('a\nb\n', 'a\nb\n'))).toEqual([
      {
        left: { kind: 'unchanged', text: 'a' },
        right: { kind: 'unchanged', text: 'a' },
      },
      {
        left: { kind: 'unchanged', text: 'b' },
        right: { kind: 'unchanged', text: 'b' },
      },
    ]);
  });

  it('places a replacement on a single row', () => {
    expect(
      pairProfileDiffLines(
        diffProfileLines('{\n    "layer_height": "0.2"\n}\n', '{\n    "layer_height": "0.3"\n}\n'),
      ),
    ).toEqual([
      {
        left: { kind: 'unchanged', text: '{' },
        right: { kind: 'unchanged', text: '{' },
      },
      {
        left: { kind: 'removed', text: '    "layer_height": "0.2"' },
        right: { kind: 'added', text: '    "layer_height": "0.3"' },
      },
      {
        left: { kind: 'unchanged', text: '}' },
        right: { kind: 'unchanged', text: '}' },
      },
    ]);
  });

  it('leaves a blank on the opposite side of an insertion or deletion', () => {
    expect(pairProfileDiffLines(diffProfileLines('a\nc\n', 'a\nb\nc\n'))).toEqual([
      {
        left: { kind: 'unchanged', text: 'a' },
        right: { kind: 'unchanged', text: 'a' },
      },
      {
        left: { kind: 'empty', text: '' },
        right: { kind: 'added', text: 'b' },
      },
      {
        left: { kind: 'unchanged', text: 'c' },
        right: { kind: 'unchanged', text: 'c' },
      },
    ]);
    expect(pairProfileDiffLines(diffProfileLines('a\nb\nc\n', 'a\nc\n'))).toEqual([
      {
        left: { kind: 'unchanged', text: 'a' },
        right: { kind: 'unchanged', text: 'a' },
      },
      {
        left: { kind: 'removed', text: 'b' },
        right: { kind: 'empty', text: '' },
      },
      {
        left: { kind: 'unchanged', text: 'c' },
        right: { kind: 'unchanged', text: 'c' },
      },
    ]);
  });

  it('zips a multi-line hunk so extra lines get a blank counterpart', () => {
    expect(pairProfileDiffLines(diffProfileLines('a\nx\nz\n', 'a\ny1\ny2\nz\n'))).toEqual([
      {
        left: { kind: 'unchanged', text: 'a' },
        right: { kind: 'unchanged', text: 'a' },
      },
      {
        left: { kind: 'removed', text: 'x' },
        right: { kind: 'added', text: 'y1' },
      },
      {
        left: { kind: 'empty', text: '' },
        right: { kind: 'added', text: 'y2' },
      },
      {
        left: { kind: 'unchanged', text: 'z' },
        right: { kind: 'unchanged', text: 'z' },
      },
    ]);
  });
});
