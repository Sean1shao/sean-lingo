import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDictionary, parseGoogle, isDictionaryQuery } from '../src/core/parsers.ts';
import { normalizeSettings } from '../src/core/settings.ts';
test('English dictionary keeps separate senses and phonetics', () => {
  const result = parseDictionary({ ec: { word: [{ ukphone: 'həˈləʊ', usphone: 'həˈloʊ', trs: [{ tr: [{ l: { i: ['int. 你好'] } }] }, { tr: [{ l: { i: ['n. 问候'] } }] }] }] } });
  assert.equal(result.uk, 'həˈləʊ'); assert.deepEqual(result.meanings, ['int. 你好', 'n. 问候']);
});
test('Chinese dictionary joins link fragments without leaking markup', () => {
  const result = parseDictionary({ ce: { word: [{ trs: [{ tr: [{ l: { i: ['', { '#text': 'how' }, ' ', { '#text': 'are' }, ' you'] } }] }] }] } });
  assert.deepEqual(result.meanings, ['how are you']);
  assert.deepEqual(parseDictionary({}).meanings, []);
});
test('Google joins only translated segments, never detected language or metadata', () => {
  assert.equal(parseGoogle([[['你好', 'Hello'], ['世界', 'world']], null, 'en', [['metadata']]]), '你好世界');
  assert.throws(() => parseGoogle({ error: 'throttled' }));
  assert.throws(() => parseGoogle([[]]));
});
test('sentences and non-Chinese targets bypass English-to-Chinese dictionary', () => {
  assert.equal(isDictionaryQuery('hello', 'zh-CN'), true);
  assert.equal(isDictionaryQuery('Hello world.', 'zh-CN'), false);
  assert.equal(isDictionaryQuery('hello', 'ja'), false);
  assert.equal(isDictionaryQuery('你好', 'en'), true);
});
test('invalid or stale settings cannot select arbitrary language or provider', () => {
  assert.deepEqual(normalizeSettings({ source: 'bad', target: 'bad', engine: 'openai', selectionButton: 'yes' }), { source: 'auto', target: 'zh-CN', engine: 'auto', selectionButton: true });
});
