interface DictionaryWord { ukphone?: string; usphone?: string; trs?: { tr?: { l?: { i?: (string | { '#text'?: string })[] } }[] }[] }
export interface DictionaryResult { uk: string; us: string; meanings: string[] }
export function parseDictionary(data: { ec?: { word?: DictionaryWord[] }; ce?: { word?: DictionaryWord[] } }): DictionaryResult {
  const word = data.ec?.word?.[0] ?? data.ce?.word?.[0];
  const meanings = (word?.trs ?? []).flatMap(item => (item.tr ?? []).map(line =>
    (line.l?.i ?? []).map(part => typeof part === 'string' ? part : part['#text'] ?? '').join('').trim()
  )).filter(Boolean);
  return { uk: word?.ukphone ?? '', us: word?.usphone ?? '', meanings: [...new Set(meanings)].slice(0, 8) };
}
export function parseGoogle(data: unknown): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('翻译服务返回了无法识别的内容');
  const text = data[0].map((segment: unknown) => Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : '').join('');
  if (!text.trim()) throw new Error('没有获得翻译结果');
  return text;
}
export function isDictionaryQuery(text: string, target: string) {
  return (target === 'zh-CN' && /^[a-zA-Z][a-zA-Z'’ -]{0,79}$/.test(text) && text.split(/\s+/).length <= 4)
    || (target === 'en' && /^[\u3400-\u9fff]{1,8}$/.test(text));
}
