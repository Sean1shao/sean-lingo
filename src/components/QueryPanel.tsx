import { useState, type FormEvent, type HTMLAttributes } from 'react';
import Translation from './Translation';
import { brand } from '../core/brand';
import icon from '../assets/icon-32.png';
export default function QueryPanel({ initialText = '', onClose, dragHandle }: { initialText?: string; onClose?: () => void; dragHandle?: HTMLAttributes<HTMLElement> }) {
  const [input, setInput] = useState(initialText);
  const [query, setQuery] = useState(initialText);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(!onClose);
  const search = () => { if (!input.trim()) return; setQuery(input.trim()); setRevision(value => value + 1); if (onClose) setEditing(false); };
  const submit = (event: FormEvent) => { event.preventDefault(); search(); };
  return <div className={`panel ${editing ? '' : 'compact'}`}><header className="panel-header" {...dragHandle}><span className="brand"><img src={icon} alt="" />{brand.name}</span><div className="header-actions">{onClose && <button className="icon-button" title="编辑原文" aria-label="编辑原文" onClick={() => setEditing(value => !value)}>✎</button>}<button className="icon-button" title="打开设置" aria-label="打开设置" onClick={() => chrome.runtime.openOptionsPage()}>⚙</button>{onClose && <button className="icon-button" title="关闭" aria-label="关闭" onClick={onClose}>×</button>}</div></header>
    {editing && <form className="query-form" onSubmit={submit}><label className="sr-only" htmlFor="query">需要翻译的内容</label><textarea id="query" maxLength={3000} value={input} onChange={e => setInput(e.target.value)} placeholder="输入单词或句子…" rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); search(); } }} /><div className="query-actions"><span>Enter 翻译 · Shift + Enter 换行</span><button className="primary" type="submit" disabled={!input.trim()}>翻译 ↗</button></div></form>}
    <Translation key={revision} text={query} showSource={!editing} /><p className="query-disclosure">查询文字将发送至有道或 Google，以提供翻译。</p></div>;
}
