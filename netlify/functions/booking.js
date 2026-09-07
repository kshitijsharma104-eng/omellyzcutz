const crypto = require('crypto');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const githubRequest = async (owner, repo, path, token, options = {}) => fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  }
);

const sendWhatsApp = async (to, body) => {
  const account = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!account || !authToken || !from) throw new Error('WhatsApp service is not configured');

  const payload = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${to}`,
    Body: body
  });
  const result = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${account}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload
  });
  if (!result.ok) throw new Error('WhatsApp message could not be sent');
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST required' });
  if (!process.env.GITHUB_TOKEN || !process.env.BARBER_WHATSAPP) {
    return json(500, { error: 'Booking service is not configured' });
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const name = String(data.name || '').trim();
    const service = String(data.service || '').trim();
    const day = String(data.day || '').trim();
    const time = String(data.time || '').trim();
    const phone = String(data.phone || '').trim();
    if (!name || !service || !day || !time || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      return json(400, { error: 'Complete every field and use a WhatsApp number with country code' });
    }

    const id = crypto.randomUUID();
    const approvalToken = crypto.randomBytes(24).toString('hex');
    const owner = process.env.GITHUB_OWNER || 'kshitijsharma104-eng';
    const repo = process.env.GITHUB_REPO || 'omellyzcutz';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const record = { id, name, service, day, time, phone, status: 'pending', approvalToken, createdAt: new Date().toISOString() };
    const path = `bookings/${id}.json`;

    const saved = await githubRequest(owner, repo, path, process.env.GITHUB_TOKEN, {
      method: 'PUT',
      body: JSON.stringify({ message: `New booking request: ${name}`, content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64'), branch })
    });
    if (!saved.ok) throw new Error('Booking could not be saved');

    const siteUrl = process.env.URL || 'https://omellyzcutz.netlify.app';
    const approvalUrl = `${siteUrl}/.netlify/functions/accept-booking?id=${encodeURIComponent(id)}&token=${approvalToken}`;
    await sendWhatsApp(process.env.BARBER_WHATSAPP, `New booking request from ${name}:\n${service}\n${day} at ${time}\nCustomer WhatsApp: ${phone}\n\nAccept booking: ${approvalUrl}`);

    return json(201, { message: 'Booking request sent. You will receive a WhatsApp confirmation after it is accepted.' });
  } catch (error) {
    console.error('Booking failed:', error);
    return json(502, { error: 'The booking could not be sent. Please try again.' });
  }
};

module.exports.sendWhatsApp = sendWhatsApp;
