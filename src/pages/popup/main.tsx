import ReactDOM from 'react-dom/client';
import QueryPanel from '../../components/QueryPanel';
import '../../style.css';
async function mount() {
  const pending = await chrome.storage.session.get('pendingText');
  if (pending.pendingText) await chrome.storage.session.remove('pendingText');
  document.body.classList.add('popup');
  ReactDOM.createRoot(document.getElementById('root')!).render(<QueryPanel initialText={typeof pending.pendingText === 'string' ? pending.pendingText : ''} />);
}
void mount();
