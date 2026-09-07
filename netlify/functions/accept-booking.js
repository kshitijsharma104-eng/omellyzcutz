const { sendWhatsApp } = require('./booking');

const html = (title, message) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8' },
  body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{margin:0;background:#12211b;color:#e9e8e2;font:18px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}main{max-width:520px}h1{font-size:2rem;color:#d9b777}p{line-height:1.6}</style></head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return html('Invalid request', 'This approval link must be opened in a browser.');
  const { id, token } = event.queryStringParameters || {};
  if (!id || !token || !process.env.GITHUB_TOKEN) return html('Invalid link', 'This booking approval link is incomplete or expired.');

  try {
    const owner = process.env.GITHUB_OWNER || 'kshitijsharma104-eng';
    const repo = process.env.GITHUB_REPO || 'omellyzcutz';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = `bookings/${id}.json`;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    const currentResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers });
    if (!currentResponse.ok) return html('Booking not found', 'This booking request is no longer available.');
    const current = await currentResponse.json();
    const record = JSON.parse(Buffer.from(current.content, 'base64').toString('utf8'));
    if (record.approvalToken !== token) return html('Invalid link', 'This booking approval link is not valid.');
    if (record.status === 'accepted') return html('Already accepted', 'This booking has already been accepted.');

    record.status = 'accepted';
    record.acceptedAt = new Date().toISOString();
    const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Accept booking: ${record.name}`, content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64'), sha: current.sha, branch })
    });
    if (!updateResponse.ok) throw new Error('Booking update failed');

    const message = `Your Omellyzcutz booking is confirmed for ${record.day} at ${record.time}. Service: ${record.service}. See you soon, ${record.name}!`;
    await sendWhatsApp(record.phone, message);
    await sendWhatsApp(process.env.BARBER_WHATSAPP, `Booking accepted for ${record.name}: ${record.service}, ${record.day} at ${record.time}.`);
    return html('Booking accepted', `Confirmation messages have been sent to ${record.name} and the barber.`);
  } catch (error) {
    console.error('Booking acceptance failed:', error);
    return html('Something went wrong', 'The booking was not fully confirmed. Please try the link again or contact the shop.');
  }
};
