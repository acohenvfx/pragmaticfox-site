# Pragmatic Fox

Static marketing site for the Pragmatic Fox Avid tools.

This project intentionally contains no licensing, account, checkout, helper,
download, or application runtime. Those services remain on their existing
hosts until a separate migration is approved.

Public demo videos are stored in the `pragmaticfox-media` R2 bucket and served
from `https://media.pragmaticfox.com`. Local MP4 files remain in `public/` as
source copies, but `public/.assetsignore` excludes them from website deploys.

## Local preview

```bash
yarn
yarn dev
```

## Validation and deployment

```bash
yarn validate
yarn deploy
```

## Contact form setup

The contact form uses Web3Forms, so it does not require Cloudflare Email
Sending, a Worker email binding, or a paid email plan. Submissions are sent to
the destination email address configured in the Web3Forms account. The public
access key is stored in `public/contact/index.html`; Web3Forms documents this
key as safe to expose in client-side code.

To change the destination or rotate the form key, create or update the form in
the Web3Forms dashboard, then replace the hidden `access_key` value in
`public/contact/index.html`. Keep the form's name, email, message, and honeypot
field names intact. Test both a successful submission and an invalid request
before deploying, and check Gmail's spam folder during the first tests.
