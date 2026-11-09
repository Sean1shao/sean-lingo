import { getSettings, normalizeSettings } from './core/settings';
import { parseGoogle } from './core/parsers';
import { brand } from './core/brand';

const dictionaryCache = new Map<string, { value: unknown; until: number }>();
async function request(url: string, json: boolean) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`服务暂时不可用（${response.status}）`);
  return json ? response.json() : response.text();
}
function validateText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('请输入需要翻译的文字');
  if (value.length > 3000) throw new Error('每次最多翻译 3000 个字符，请缩短选中文字');
  return value.trim();
}
async function handle(message: { type: string; text?: unknown; settings?: object; accent?: unknown }) {
  if (message.type === 'pronounce') {
    const text = validateText(message.text);
    if (text.length > 80 || !/^[a-zA-Z][a-zA-Z'’ -]*$/.test(text)) throw new Error('仅支持英文单词和短语发音');
    const response = await fetch(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=en&type=${message.accent === 'uk' ? 1 : 2}`, { signal: AbortSignal.timeout(12000), credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('发音加载失败，请重试');
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  }
  if (message.type === 'dictionary') {
    const text = validateText(message.text);
    const cached = dictionaryCache.get(text);
    if (cached && cached.until > Date.now()) return cached.value;
    const value = await request(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(text)}`, true);
    if (dictionaryCache.size >= 100) dictionaryCache.delete(dictionaryCache.keys().next().value!);
    dictionaryCache.set(text, { value, until: Date.now() + 300000 });
    return value;
  }
  if (message.type === 'translate') {
    const text = validateText(message.text);
    const settings = normalizeSettings(message.settings ?? await getSettings());
    const youdao = async () => {
      const chinese = /[\u3400-\u9fff]/.test(text);
      const source = settings.source === 'auto' ? (chinese ? 'zh-CN' : 'en') : settings.source;
      const foreign = source.startsWith('zh') ? settings.target : source;
      if (!((source.startsWith('zh') && !settings.target.startsWith('zh')) || (!source.startsWith('zh') && settings.target === 'zh-CN')) || !['en', 'ja', 'ko', 'fr'].includes(foreign)) {
        throw new Error('有道支持中英、中日、中韩、中法互译。其他语言请使用 Google；日、韩、法语请明确选择源语言。');
      }
      return { html: await request(`https://www.youdao.com/result?word=${encodeURIComponent(text)}&lang=${foreign}`, false), provider: '有道翻译' };
    };
    if (settings.engine === 'youdao') return youdao();
    try {
      const params = new URLSearchParams({ client: 'gtx', sl: settings.source, tl: settings.target, dt: 't', q: text });
      return { text: parseGoogle(await request(`https://translate.googleapis.com/translate_a/single?${params}`, true)), provider: 'Google 翻译' };
    } catch (error) {
      if (settings.engine !== 'auto') throw error;
      try { return await youdao(); } catch { throw new Error('翻译请求失败，请检查网络，或在设置中选择其他翻译服务和源语言后重试。'); }
    }
  }
  throw new Error('未知请求');
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !['dictionary', 'translate', 'pronounce'].includes(message?.type)) return false;
  handle(message).then(data => respond({ data })).catch(error => respond({ error: error instanceof Error ? error.message : '请求失败，请稍后重试' }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: 'translate', title: `使用 ${brand.name} 翻译`, contexts: ['selection'] }));
});
async function openSelection(tabId?: number, text?: string) {
  if (tabId === undefined) return;
  try { await chrome.tabs.sendMessage(tabId, { type: 'open-translation', text }); }
  catch {
    if (text) await chrome.storage.session.set({ pendingText: text });
    try { await chrome.action.openPopup(); } catch { /* The toolbar popup remains available. */ }
  }
}
chrome.contextMenus.onClicked.addListener((info, tab) => { if (info.menuItemId === 'translate') void openSelection(tab?.id, info.selectionText); });
chrome.commands.onCommand.addListener(async command => {
  if (command !== 'translate-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await openSelection(tab?.id);
});
