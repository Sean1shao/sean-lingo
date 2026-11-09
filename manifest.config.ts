import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';
import { brand } from './src/core/brand';
export default defineManifest({
  manifest_version: 3, name: brand.name, short_name: brand.name, version: pkg.version,
  description: '轻量划词翻译：单词释义、英美发音与句子翻译。免费使用，无需注册。',
  author: brand.name,
  icons: { 16: 'src/assets/icon-16.png', 32: 'src/assets/icon-32.png', 48: 'src/assets/icon-48.png', 128: 'src/assets/icon-128.png' },
  action: { default_title: brand.name, default_icon: { 16: 'src/assets/icon-16.png', 32: 'src/assets/icon-32.png' }, default_popup: 'src/pages/popup/index.html' },
  permissions: ['storage', 'contextMenus'],
  host_permissions: ['https://www.youdao.com/*', 'https://dict.youdao.com/*', 'https://translate.googleapis.com/*'],
  content_scripts: [{ js: ['src/contentScript/index.tsx'], matches: ['http://*/*', 'https://*/*'] }],
  options_page: 'src/pages/options/index.html',
  background: { service_worker: 'src/background.ts', type: 'module' },
  commands: { 'translate-selection': { suggested_key: { default: 'Alt+L' }, description: '翻译选中的文字' } },
});
