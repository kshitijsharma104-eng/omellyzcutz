# Omellyzcutz Whitechapel South

Single-page barber shop landing site for Omellyzcutz Whitechapel South.

## Local preview

Open `index.html` directly in a browser, or run a quick local server:

```bash
python3 -m http.server 8000
```

Then visit:

http://localhost:8000

## Deployment

This project is static and is ready for:

- Netlify
- GitHub Pages

For Netlify, connect the repository and use the default publish directory `.`.

## GitHub image uploads

The Recent work uploader uses the Netlify Function at `/.netlify/functions/upload-image`.
In Netlify, add these environment variables before deploying:

- `GITHUB_TOKEN`: a fine-grained GitHub token with **Contents: Read and write** access to this repository only
- `GITHUB_OWNER`: `kshitijsharma104-eng`
- `GITHUB_REPO`: `omellyzcutz`
- `GITHUB_BRANCH`: `main`

The token is used only by Netlify and is never sent to the browser. Each upload is committed to `photos/`, which triggers the normal GitHub-to-Netlify deploy flow.
For GitHub Pages, publish the root branch (or use the static site branch) and ensure `.nojekyll` is included.
