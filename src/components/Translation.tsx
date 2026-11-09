import { useEffect, useRef, useState } from 'react';
import { send } from '../core/client';
import { isDictionaryQuery, parseDictionary, type DictionaryResult } from '../core/parsers';
import { getSettings } from '../core/settings';

export default function Translation({ text, showSource = true }: { text: string; showSource?: boolean }) {
  const [result, setResult] = useState('');
  const [dictionary, setDictionary] = useState<DictionaryResult | null>(null);
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => { void audio.current?.close(); }, []);
  useEffect(() => {
    let active = true;
    setResult(''); setDictionary(null); setProvider(''); setError(''); setCopied(false); setCopyError('');
    if (!text.trim()) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      const settings = await getSettings();
      if (isDictionaryQuery(text, settings.target) && (settings.source === 'auto' || settings.source === 'en' || settings.source.startsWith('zh'))) {
        try {
          const data = parseDictionary(await send<Parameters<typeof parseDictionary>[0]>('dictionary', text));
          if (data.meanings.length) { if (active) { setDictionary(data); setProvider('有道词典'); } return; }
        } catch { /* A missing entry can still be translated as text. */ }
      }
      const data = await send<{ text?: string; html?: string; provider: string }>('translate', text, settings);
      let translated = data.text ?? '';
      if (data.html) {
        const doc = new DOMParser().parseFromString(data.html, 'text/html');
        translated = doc.querySelector('.trans-content')?.textContent?.trim() ?? '';
      }
      if (!translated) throw new Error('没有获得翻译结果，请尝试更换翻译服务');
      if (active) { setResult(translated); setProvider(data.provider); }
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : '翻译失败，请重试'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [text, attempt]);
  if (!text.trim()) return <div className="empty"><span className="empty-icon">文</span><h2>读懂每一个词，每一句话</h2><p>在网页选中文字，或在上方输入内容。</p><small>Alt + L 快速翻译选中文字</small></div>;
  const copy = async () => {
    try { await navigator.clipboard.writeText(dictionary?.meanings.join('\n') || result); setCopied(true); setCopyError(''); }
    catch { setCopyError('复制失败，请手动选中结果复制'); }
  };
  const pronounce = async (accent: 'uk' | 'us') => {
    setSpeaking(true); setAudioError('');
    try {
      await audio.current?.close();
      const context = new AudioContext(); audio.current = context;
      await context.resume();
      const response = await chrome.runtime.sendMessage({ type: 'pronounce', text, accent });
      if (response?.error) throw new Error(response.error);
      if (audio.current !== context || context.state === 'closed') return;
      const buffer = await context.decodeAudioData(new Uint8Array(response.data).buffer);
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start();
    } catch (e) { setAudioError(e instanceof Error ? e.message : '播放失败，请重试'); }
    finally { setSpeaking(false); }
  };
  return <section className="result" aria-live="polite" aria-busy={loading}>
    {showSource && <div className="source-text">{text}</div>}<div className="divider"><span>{loading ? '正在查询' : provider || '翻译结果'}</span></div>
    {loading && <div className="loading"><span className="spinner" />正在翻译，请稍候…</div>}
    {error && <div className="error" role="alert"><p>{error}</p><button className="secondary" onClick={() => setAttempt(x => x + 1)}>重新尝试</button></div>}
    {dictionary && <><div className="phonetics">{dictionary.uk && <button className="text-button" disabled={speaking} onClick={() => pronounce('uk')} title="播放英式发音">英 /{dictionary.uk}/ ♫</button>}{dictionary.us && <button className="text-button" disabled={speaking} onClick={() => pronounce('us')} title="播放美式发音">美 /{dictionary.us}/ ♫</button>}</div><ul className="meanings">{dictionary.meanings.map(item => <li key={item}>{item}</li>)}</ul></>}
    {result && <p className="translated">{result}</p>}
    {(result || dictionary) && <div className="result-footer"><span>{dictionary ? '单词释义' : '句子翻译'}</span><button className="text-button" onClick={copy}>{copied ? '已复制' : '复制结果'}</button></div>}
    {copyError && <p role="alert" className="error">{copyError}</p>}
    {audioError && <p role="alert" className="error">{audioError}</p>}
  </section>;
}
