import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const runtime = process.env.CODEX_NODE_MODULES;
const require = createRequire(runtime ? path.join(runtime, 'index.js') : import.meta.url);
const { chromium } = require('playwright');
const extension = path.resolve('dist/chrome');
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json')));
assert.deepEqual(manifest.permissions.sort(), ['contextMenus', 'storage']);
assert.equal(manifest.oauth2, undefined);
assert.equal(manifest.externally_connectable, undefined);
assert.equal(manifest.name, 'Sean Lingo');
assert.equal(manifest.version, '1.0.0');
assert.equal(Object.keys(manifest.icons).length, 4);
const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'lingo-test-')), {
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  viewport: { width: 1280, height: 800 },
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined,
});
const checks = [];
const errors = [];
context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 20000 });
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/src/pages/popup/index.html`);
  await popup.getByText('读懂每一个词，每一句话').waitFor();
  assert.equal(await popup.title(), 'Sean Lingo');
  assert.equal(await popup.locator('.brand').innerText(), 'Sean Lingo');
  const query = async text => { await popup.getByRole('textbox').fill(text); await popup.getByRole('button', { name: '翻译 ↗' }).click(); };
  await query('hello');
  await popup.locator('.meanings').waitFor({ timeout: 35000 });
  assert.match(await popup.locator('.meanings').innerText(), /你好/);
  assert.match(await popup.locator('.phonetics').innerText(), /英[\s\S]*美/);
  await popup.screenshot({ path: 'artifacts/popup-word.png' });
  checks.push('real Youdao English dictionary + phonetics');
  await popup.getByTitle('播放英式发音').click();
  await popup.waitForFunction(() => !document.querySelector('.phonetics button').disabled);
  assert.equal(await popup.getByRole('alert').count(), 0);
  checks.push('real online pronunciation decoded successfully');
  await query('Every agent run produces signals.');
  await popup.locator('.translated').waitFor({ timeout: 40000 });
  assert.match(await popup.locator('.translated').innerText(), /[\u3400-\u9fff]/);
  assert.equal(await popup.locator('.divider').innerText(), 'Google 翻译');
  await popup.screenshot({ path: 'artifacts/popup-sentence.png' });
  checks.push('real sentence translation');
  await worker.evaluate(() => { globalThis.originalFetch = globalThis.fetch; globalThis.fetch = (url, ...args) => String(url).includes('translate.googleapis.com') ? Promise.reject(new Error('simulated unavailable')) : globalThis.originalFetch(url, ...args); });
  await query('We learn something new every day.');
  await popup.locator('.translated').waitFor({ timeout: 35000 });
  assert.equal(await popup.locator('.divider').innerText(), '有道翻译');
  checks.push('automatic fallback to real Youdao when Google is unavailable');
  await worker.evaluate(() => { globalThis.fetch = () => Promise.reject(new Error('simulated offline')); });
  await query('Please try this sentence again.');
  await popup.getByRole('button', { name: '重新尝试' }).waitFor();
  await worker.evaluate(() => { globalThis.fetch = globalThis.originalFetch; });
  await popup.getByRole('button', { name: '重新尝试' }).click();
  await popup.locator('.translated').waitFor({ timeout: 35000 });
  checks.push('offline error and retry recover successfully');
  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/src/pages/options/index.html`);
  await options.getByRole('button', { name: '保存设置' }).waitFor();
  await options.getByLabel('句子翻译服务').selectOption('youdao');
  await options.getByRole('button', { name: '保存设置' }).click();
  await options.getByRole('status').filter({ hasText: '设置已保存' }).waitFor();
  await query('This is a beautiful day.');
  await popup.locator('.translated').waitFor({ timeout: 35000 });
  assert.match(await popup.locator('.translated').innerText(), /[\u3400-\u9fff]/);
  assert.equal(await popup.locator('.divider').innerText(), '有道翻译');
  checks.push('real Youdao sentence translation + shared settings');
  await options.getByLabel('目标语言').selectOption('en');
  await options.getByRole('button', { name: '保存设置' }).click();
  await query('你好');
  await popup.locator('.meanings').waitFor({ timeout: 35000 });
  assert.match(await popup.locator('.meanings').innerText(), /hello/);
  checks.push('real Chinese-to-English dictionary');
  const limit = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'translate', text: 'x'.repeat(3001) }));
  assert.match(limit.error, /3000/);
  const invalid = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'translate', text: 'hello world.', settings: { source: 'en', target: 'de', engine: 'youdao' } }));
  assert.match(invalid.error, /有道支持/);
  checks.push('length validation and unsupported language errors');
  await options.getByLabel('目标语言').selectOption('zh-CN');
  await options.getByRole('button', { name: '保存设置' }).click();
  await options.reload();
  await options.getByRole('button', { name: '保存设置' }).waitFor();
  assert.equal(await options.getByLabel('句子翻译服务').inputValue(), 'youdao');
  await options.screenshot({ path: 'artifacts/settings.png', fullPage: true });
  checks.push('settings survive reload');
  await options.screenshot({ path: 'publishing/images/screenshot-3-settings-1280x800.png' });
  const privacy = await context.newPage();
  await privacy.goto(`chrome-extension://${id}/legal/privacy.html`);
  assert.match(await privacy.locator('body').innerText(), /759112444@qq.com/);
  const legal = await context.newPage();
  await legal.goto(`chrome-extension://${id}/legal/open-source.html`);
  assert.match(await legal.locator('body').innerText(), /GPL/);
  await privacy.close(); await legal.close();
  checks.push('brand and bundled privacy/open-source pages');
  const page = await context.newPage();
  await context.route('https://lingo-test.example/**', route => route.fulfill({ contentType: 'text/html', body: fs.readFileSync('publishing/demo.html', 'utf8') }));
  await page.goto('https://lingo-test.example/');
  await page.waitForSelector('sean-lingo', { state: 'attached' });
  const cdp = await context.newCDPSession(page);
  async function findNode(className) {
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    function visit(node) {
      const attrs = node.attributes || [];
      if (attrs.some((attr, i) => attr === 'class' && (attrs[i + 1] || '').split(' ').includes(className))) return node;
      for (const child of [...node.children || [], ...node.shadowRoots || []]) { const result = visit(child); if (result) return result; }
    }
    return visit(root);
  }
  async function waitNode(className) {
    for (let i = 0; i < 80; i++) { const node = await findNode(className); if (node) return node; await new Promise(r => setTimeout(r, 100)); }
    throw new Error(`Missing shadow node: ${className}`);
  }
  await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('#sample')); const selected = window.getSelection(); selected.removeAllRanges(); selected.addRange(range); document.querySelector('#sample').dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 780, clientY: 130 })); });
  const trigger = await waitNode('selection-trigger');
  const { model } = await cdp.send('DOM.getBoxModel', { nodeId: trigger.nodeId });
  await page.mouse.click((model.border[0] + model.border[4]) / 2, (model.border[1] + model.border[5]) / 2);
  await waitNode('meanings');
  const cardNode = await waitNode('floating-card');
  const { object: cardObject } = await cdp.send('DOM.resolveNode', { nodeId: cardNode.nodeId });
  const { result: layout } = await cdp.send('Runtime.callFunctionOn', { objectId: cardObject.objectId, functionDeclaration: 'function(){const r=this.getBoundingClientRect();return {bottom:r.bottom,height:innerHeight,font:getComputedStyle(this.querySelector(".panel")).fontFamily,input:!!this.querySelector("textarea")}}', returnByValue: true });
  assert.ok(layout.value.bottom <= layout.value.height);
  assert.match(layout.value.font, /Segoe UI/);
  assert.equal(layout.value.input, false);
  await page.screenshot({ path: 'artifacts/selection-card.png' });
  await page.screenshot({ path: 'publishing/images/screenshot-1-word-1280x800.png' });
  checks.push('actual closed-shadow selection button and word card');
  await page.keyboard.press('Escape');
  assert.equal(await findNode('floating-card'), undefined);
  const tab = await popup.evaluate(async () => (await chrome.tabs.query({})).find(t => t.url?.includes('lingo-test.example')));
  // Find the content tab by its title when tab URL access is unavailable without tabs permission.
  const tabs = await worker.evaluate(() => chrome.tabs.query({}));
  const target = tab?.id ?? tabs[tabs.length - 1].id;
  await popup.evaluate(async ({ target }) => chrome.tabs.sendMessage(target, { type: 'open-translation', text: 'hello' }), { target });
  await waitNode('floating-card');
  checks.push('runtime context-menu/shortcut message opens card; Escape closes');
  await popup.evaluate(async ({ target }) => chrome.tabs.sendMessage(target, { type: 'open-translation', text: 'We learn something new every day.' }), { target });
  await waitNode('translated');
  await page.screenshot({ path: 'publishing/images/screenshot-2-sentence-1280x800.png' });
  await page.keyboard.press('Escape');
  await options.getByLabel('显示划词翻译按钮').uncheck();
  await options.getByRole('button', { name: '保存设置' }).click();
  await page.evaluate(() => document.querySelector('#sample').dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 160, clientY: 100 })));
  assert.equal(await findNode('selection-trigger'), undefined);
  checks.push('selection button setting applies to existing pages');
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/verification.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await context.close(); }
