const SNAPSHOT = {
  mode: 'unavailable',
  link: 'disconnected',
  activeCall: null,
  operatorEndpoint: '',
  mediaMode: 'control-plane',
  message: 'Постійний міст Asterisk не налаштований на цьому хості. Ручна реєстрація заявки доступна.'
};

export default function handler(req, res) {
  const url = req.url ?? '';
  if (req.method === 'GET' && url.includes('/events')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200);
    res.end(`data: ${JSON.stringify(SNAPSHOT)}\n\n`);
    return;
  }
  if (req.method === 'POST') {
    res.status(409).json({ error: 'asterisk_unavailable', ...SNAPSHOT });
    return;
  }
  res.status(200).json(SNAPSHOT);
}
