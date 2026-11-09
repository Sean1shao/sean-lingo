export async function send<T>(type: 'dictionary' | 'translate', text: string, settings?: object): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, text, settings });
  if (response?.error) throw new Error(response.error);
  if (!response || !('data' in response)) throw new Error('扩展连接已失效，请刷新网页后重试');
  return response.data as T;
}
