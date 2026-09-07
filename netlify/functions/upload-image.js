const MAX_FILE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif']
]);

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const decodeMultipart = (event) => {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('Invalid upload format');

  const boundary = Buffer.from('--' + (boundaryMatch[1] || boundaryMatch[2]));
  const body = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'binary');
  const start = body.indexOf(boundary);
  if (start < 0) throw new Error('Upload file not found');

  const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), start);
  if (headerEnd < 0) throw new Error('Invalid upload headers');
  const headers = body.slice(start + boundary.length + 2, headerEnd).toString('utf8');
  const disposition = headers.match(/name="([^"]+)";\s*filename="([^"]*)"/i);
  const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
  if (!disposition || disposition[1] !== 'image' || !typeMatch) throw new Error('Image file is required');

  const fileStart = headerEnd + 4;
  const fileEnd = body.indexOf(Buffer.from('\r\n--'), fileStart);
  if (fileEnd < 0) throw new Error('Invalid upload body');

  return {
    name: disposition[2],
    type: typeMatch[1].trim().toLowerCase(),
    data: body.slice(fileStart, fileEnd)
  };
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'POST required' });
  if (!process.env.GITHUB_TOKEN) return response(500, { error: 'Upload service is not configured' });

  try {
    const file = decodeMultipart(event);
    const extension = allowedTypes.get(file.type);
    if (!extension) return response(400, { error: 'Use a JPG, PNG, WEBP, GIF or AVIF image' });
    if (!file.data.length || file.data.length > MAX_FILE_SIZE) {
      return response(400, { error: 'Images must be smaller than 8 MB' });
    }

    const baseName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.[^.]+$/, '') || 'photo';
    const fileName = `${Date.now()}-${baseName}.${extension}`;
    const owner = process.env.GITHUB_OWNER || 'kshitijsharma104-eng';
    const repo = process.env.GITHUB_REPO || 'omellyzcutz';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = `photos/${fileName}`;
    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add recent work image: ${fileName}`,
        content: file.data.toString('base64'),
        branch
      })
    });

    if (!githubResponse.ok) {
      console.error('GitHub upload failed:', githubResponse.status, await githubResponse.text());
      return response(502, { error: 'GitHub could not save the image' });
    }

    return response(201, {
      name: fileName,
      url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    return response(400, { error: error.message || 'Could not upload image' });
  }
};
