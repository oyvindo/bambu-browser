/**
 * Helpers for reading option definitions out of a slicer's PrintConfig.cpp.
 * OrcaSlicer and PrusaSlicer both inherit Slic3r's `def->field = …;` layout.
 */

export function decodeCppString(raw) {
  const jsonString = raw
    .replace(/^u8/, '')
    .replace(/\\x([0-9a-fA-F]{2})/g, (_match, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString
      .slice(1, -1)
      .replaceAll('\\n', '\n')
      .replaceAll('\\"', '"')
      .replaceAll('\\\\', '\\');
  }
}

export function stringsIn(expression) {
  return [...expression.matchAll(/(?:u8)?"(?:\\.|[^"\\])*"/g)].map((match) =>
    decodeCppString(match[0]),
  );
}

/** Right-hand side of `def->property = …;`, honouring `;` inside strings. */
export function assignment(block, property) {
  const startMatch = new RegExp(`def\\s*->\\s*${property}\\s*=\\s*`).exec(block);
  if (!startMatch || startMatch.index === undefined) return null;

  const start = startMatch.index + startMatch[0].length;
  let inString = false;
  for (let index = start; index < block.length; index += 1) {
    const char = block[index];
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === ';') {
      return block.slice(start, index);
    }
  }
  return null;
}

export function assignedText(block, property) {
  const expression = assignment(block, property);
  if (!expression) return undefined;
  const parts = stringsIn(expression);
  return parts.length > 0 ? parts.join('') : undefined;
}

/**
 * Readers that need the whole file: numeric constants (`def->max = max_temp;`)
 * and `t_config_enum_values` maps referenced through `enum_keys_map`.
 */
export function createPrintConfigReader(text) {
  const constants = new Map();
  for (const match of text.matchAll(
    /(?:static\s+)?const\s+(?:int|float|double)\s+(\w+)\s*=\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?f?)\s*;/gi,
  )) {
    const value = Number(match[2].replace(/f$/i, ''));
    if (Number.isFinite(value)) constants.set(match[1], value);
  }

  function numberFrom(raw) {
    const trimmed = raw.trim().replace(/f$/i, '');
    if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(trimmed)) {
      return Number(trimmed);
    }
    const constant = trimmed.match(/^([+-]?)([A-Za-z_]\w*)$/);
    if (!constant) return undefined;
    const value = constants.get(constant[2]);
    if (value === undefined) return undefined;
    return constant[1] === '-' ? -value : value;
  }

  const enumKeyMaps = new Map();
  for (const match of text.matchAll(
    /(?:static\s+)?t_config_enum_values\s+(\w+)\s*\{([\s\S]*?)\};/g,
  )) {
    const values = [...match[2].matchAll(/\{\s*(?:u8)?"((?:\\.|[^"\\])*)"\s*,[\s\S]*?\}/g)].map(
      (entry) => decodeCppString(`"${entry[1]}"`),
    );
    if (values.length > 0) enumKeyMaps.set(match[1], values);
  }

  function enumValuesFrom(block) {
    const mapName = block.match(/def\s*->\s*enum_keys_map\s*=\s*&(\w+)\s*;/)?.[1];
    if (mapName && enumKeyMaps.has(mapName)) return enumKeyMaps.get(mapName);

    const direct = [
      ...block.matchAll(
        /enum_values\.(?:push_back|emplace_back)\(\s*(?:L\(\s*)?((?:u8)?"(?:\\.|[^"\\])*")\s*\)?\s*\)/g,
      ),
    ].map((entry) => decodeCppString(entry[1]));
    if (direct.length > 0) return direct;

    const assigned = assignment(block, 'enum_values');
    if (assigned?.trim().startsWith('{')) {
      const values = stringsIn(assigned);
      if (values.length > 0) return values;
    }
    return undefined;
  }

  return { numberFrom, enumValuesFrom };
}
