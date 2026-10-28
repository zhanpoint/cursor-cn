// Edit one root property without losing JSONC comments or unrelated formatting.
export function setJsoncProperty(source: string, key: string, value: unknown): string {
  const tokens = [...source.matchAll(/"(?:\\[\s\S]|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|\s+|./gs)]
    .filter(match => !/^\s|^\uFEFF|^\/[/\*]/.test(match[0]));
  const normalized = tokens.filter((token, index) =>
    token[0] !== ',' || !['}', ']'].includes(tokens[index + 1]?.[0])
  ).map(token => token[0]).join('');
  const parsed = JSON.parse(normalized);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Runtime arguments must be a JSONC object');
  }
  const replacement = JSON.stringify(value);
  if (replacement === undefined) throw new Error('Property value must be JSON serializable');
  if (JSON.stringify(parsed[key]) === replacement) return source;

  let depth = 0;
  let property = -1;
  for (let index = 0; index < tokens.length; index++) {
    const text = tokens[index][0];
    if (depth === 1 && text.startsWith('"') && tokens[index + 1]?.[0] === ':' &&
        JSON.parse(text) === key) property = index;
    if (text === '{' || text === '[') depth++;
    if (text === '}' || text === ']') depth--;
  }
  if (property >= 0) {
    const start = property + 2;
    let end = start;
    depth = 0;
    for (; end < tokens.length; end++) {
      const text = tokens[end][0];
      if (depth === 0 && (text === ',' || text === '}')) break;
      if (text === '{' || text === '[') depth++;
      if (text === '}' || text === ']') depth--;
    }
    const from = tokens[start].index!;
    const last = tokens[end - 1];
    return source.slice(0, from) + replacement + source.slice(last.index! + last[0].length);
  }
  const offset = tokens[0].index! + 1;
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const entry = `${newline}  ${JSON.stringify(key)}: ${replacement}${tokens.length > 2 ? ',' : ''}`;
  return source.slice(0, offset) + entry + source.slice(offset);
}
