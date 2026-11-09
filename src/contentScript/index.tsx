import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QueryPanel from '../components/QueryPanel';
import { getText } from '../utils/getSelection';
import { getSettings } from '../core/settings';
import styles from '../style.css?inline';
const host = document.createElement('sean-lingo');
host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;';
const shadow = host.attachShadow({ mode: 'closed' });
const style = document.createElement('style'); style.textContent = styles;
const mount = document.createElement('div'); shadow.append(style, mount);
document.documentElement.append(host);
export function App() {
  const [selected, setSelected] = useState<{ text: string; x: number; y: number } | null>(null);
  const [card, setCard] = useState<{ text: string; id: number; x: number; y: number } | null>(null);
  const buttonEnabled = useRef(true);
  const dragging = useRef<{ x: number; y: number; left: number; top: number; pointer: number } | null>(null);
  useEffect(() => {
    void getSettings().then(s => { buttonEnabled.current = s.selectionButton; });
    const onSettings = (changes: { [key: string]: chrome.storage.StorageChange }) => { if (changes.simpleSettings) { buttonEnabled.current = changes.simpleSettings.newValue?.selectionButton !== false; setSelected(null); } };
    const open = (text: string, x = window.innerWidth / 2 - 200, y = 80) => {
      if (!text.trim()) return;
      setSelected(null); setCard({ text: text.trim(), id: Date.now(), x: Math.max(8, Math.min(x, window.innerWidth - 428)), y: Math.max(8, Math.min(y, window.innerHeight - 150)) });
    };
    const selection = (event: MouseEvent) => {
      if (event.composedPath().includes(host) || !buttonEnabled.current) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active.type === 'password') return;
      const text = getText().trim();
      setSelected(text ? { text, x: Math.max(8, Math.min(event.clientX + 8, window.innerWidth - 48)), y: Math.max(8, Math.min(event.clientY + 12, window.innerHeight - 48)) } : null);
    };
    const close = (event: PointerEvent) => { if (!event.composedPath().includes(host)) { setCard(null); setSelected(null); } };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelected(null); setCard(null); } };
    const message = (data: { type: string; text?: string }) => { if (data.type === 'open-translation') open(data.text ?? getText()); };
    const resize = () => { setSelected(null); setCard(c => c ? { ...c, x: Math.max(8, Math.min(c.x, window.innerWidth - 428)), y: Math.max(8, Math.min(c.y, window.innerHeight - 150)) } : null); };
    const fullscreen = () => { (document.fullscreenElement ?? document.documentElement).appendChild(host); };
    document.addEventListener('mouseup', selection); document.addEventListener('pointerdown', close); document.addEventListener('keydown', key); document.addEventListener('fullscreenchange', fullscreen); window.addEventListener('resize', resize);
    chrome.runtime.onMessage.addListener(message); chrome.storage.onChanged.addListener(onSettings);
    return () => { document.removeEventListener('mouseup', selection); document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', fullscreen); window.removeEventListener('resize', resize); chrome.runtime.onMessage.removeListener(message); chrome.storage.onChanged.removeListener(onSettings); };
  }, []);
  return <>{selected && <button className="selection-trigger" title="翻译选中文字" aria-label="翻译选中文字" style={{ left: selected.x, top: selected.y }} onClick={() => { setCard({ ...selected, id: Date.now(), x: Math.max(8, Math.min(selected.x, innerWidth - 428)), y: Math.max(8, Math.min(selected.y, innerHeight - 150)) }); setSelected(null); }}>译</button>}{card && <div className="floating-card" style={{ left: card.x, top: card.y, maxHeight: Math.max(68, innerHeight - card.y - 12) }}><QueryPanel key={card.id} initialText={card.text} onClose={() => setCard(null)} dragHandle={{ onPointerDown: e => { if ((e.target as HTMLElement).closest('button') || e.button !== 0) return; dragging.current = { x: e.clientX, y: e.clientY, left: card.x, top: card.y, pointer: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); }, onPointerMove: e => { const start = dragging.current; if (!start || start.pointer !== e.pointerId) return; setCard(c => c ? { ...c, x: Math.max(8, Math.min(start.left + e.clientX - start.x, innerWidth - 428)), y: Math.max(8, Math.min(start.top + e.clientY - start.y, innerHeight - 80)) } : null); }, onPointerUp: () => { dragging.current = null; }, onPointerCancel: () => { dragging.current = null; } }} /></div>}</>;
}
createRoot(mount).render(<App />);
