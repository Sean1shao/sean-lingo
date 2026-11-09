export const languages = [['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['en', '英语'], ['ja', '日语'], ['ko', '韩语'], ['fr', '法语'], ['de', '德语'], ['es', '西班牙语']] as const;
export interface Settings { source: string; target: string; engine: 'auto' | 'google' | 'youdao'; selectionButton: boolean }
export const defaults: Settings = { source: 'auto', target: 'zh-CN', engine: 'auto', selectionButton: true };
export function normalizeSettings(value: Partial<Settings> = {}): Settings {
  const codes: string[] = languages.map(([code]) => code);
  return {
    source: value.source === 'auto' || codes.includes(value.source ?? '') ? value.source! : defaults.source,
    target: codes.includes(value.target ?? '') ? value.target! : defaults.target,
    engine: ['auto', 'google', 'youdao'].includes(value.engine ?? '') ? value.engine! : defaults.engine,
    selectionButton: typeof value.selectionButton === 'boolean' ? value.selectionButton : true,
  };
}
export async function getSettings(): Promise<Settings> {
  return normalizeSettings((await chrome.storage.local.get('simpleSettings')).simpleSettings);
}
export async function saveSettings(value: Settings) {
  await chrome.storage.local.set({ simpleSettings: normalizeSettings(value) });
}
