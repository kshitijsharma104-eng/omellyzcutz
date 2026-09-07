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

## Booking approvals

The booking form saves each request under `bookings/` in GitHub. Netlify sends the barber an approval link on WhatsApp; opening that link marks the booking accepted and sends a confirmation to both the customer and barber.

Add these Netlify environment variables for the booking flow:

- `BARBER_WHATSAPP`: barber's number in international format, such as `+447934681246`
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `TWILIO_WHATSAPP_FROM`: approved Twilio WhatsApp sender number in international format

The customer must provide a WhatsApp number in international format. Twilio WhatsApp sender approval and messaging rules apply.
For GitHub Pages, publish the root branch (or use the static site branch) and ensure `.nojekyll` is included.
