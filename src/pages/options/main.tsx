import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { defaults, getSettings, languages, saveSettings, type Settings } from '../../core/settings';
import '../../style.css';
import { brand } from '../../core/brand';
import icon from '../../assets/icon-128.png';
export function Options() {
  const [settings, setSettings] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => { getSettings().then(value => { setSettings(value); setReady(true); }).catch(() => setStatus('设置加载失败，请重新打开本页')); }, []);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => { setSettings(s => ({ ...s, [key]: value })); setStatus(''); };
  return <main className="settings-page"><div className="settings-brand"><img src={icon} alt="" /><span>{brand.name}</span></div><h1>{brand.tagline}</h1><p className="intro">单词释义与句子翻译，只留下阅读需要的功能。</p><form onSubmit={async e => { e.preventDefault(); try { await saveSettings(settings); setStatus('设置已保存'); } catch { setStatus('保存失败，请重试'); } }}><fieldset disabled={!ready}>
    <section className="settings-card"><h2>翻译偏好</h2><label className="setting-row"><span><strong>源语言</strong><small>大多数情况下选择自动检测即可。</small></span><select value={settings.source} onChange={e => update('source', e.target.value)}><option value="auto">自动检测</option>{languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label className="setting-row"><span><strong>目标语言</strong><small>单词词典支持英译简体中文、中译英语。</small></span><select value={settings.target} onChange={e => update('target', e.target.value)}>{languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label className="setting-row"><span><strong>句子翻译服务</strong><small>自动模式优先 Google，失败后尝试有道。</small></span><select value={settings.engine} onChange={e => update('engine', e.target.value as Settings['engine'])}><option value="auto">自动选择</option><option value="google">Google 翻译</option><option value="youdao">有道翻译</option></select></label><p className="hint">Google 需要网络能够访问其服务。有道支持中英、中日、中韩、中法互译，日、韩、法语请明确选择源语言。</p></section>
    <section className="settings-card"><h2>网页划词</h2><label className="setting-row"><span><strong>显示划词翻译按钮</strong><small>关闭后仍可使用右键菜单或 Alt + L。</small></span><input type="checkbox" checked={settings.selectionButton} onChange={e => update('selectionButton', e.target.checked)} /></label><p className="hint">快捷键可在浏览器的扩展快捷键页面调整。</p></section><div className="save-row"><button className="primary" type="submit">保存设置</button><span role="status">{status}</span></div></fieldset></form><p className="privacy-note">查询内容仅在你发起翻译时发送至所用词典或翻译服务。偏好保存在浏览器本地，不保存查询历史。</p><section className="about-product"><h2>关于 {brand.name}</h2><p>免费使用，无需注册。自愿赞助不影响任何功能的使用。</p><nav aria-label="产品信息"><a href={`mailto:${brand.supportEmail}`}>联系开发者</a><a href={chrome.runtime.getURL('legal/privacy.html')} target="_blank" rel="noreferrer">隐私政策</a><a href={chrome.runtime.getURL('legal/open-source.html')} target="_blank" rel="noreferrer">开源声明</a>{brand.sponsorUrl && <a href={brand.sponsorUrl} target="_blank" rel="noreferrer">自愿赞助</a>}</nav><small>{brand.supportEmail}</small></section></main>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Options />);
