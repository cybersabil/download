# CyberSabil Video Downloader Frontend

Responsive GitHub Pages frontend for the CyberSabil self-hosted video downloader.

## Target URL

`https://cybersabil.github.io/download/`

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- No frameworks
- No CDN or external font dependency

## Files

```text
index.html
404.html
.nojekyll
assets/
  css/style.css
  js/app.js
```

## Backend connection

The frontend is intentionally shipped with no backend endpoint hard-coded.

After the Web Downloader API is ready, edit this line near the top of `assets/js/app.js`:

```js
const API_ENDPOINT = "";
```

Example:

```js
const API_ENDPOINT = "https://cybersabil-download.xubi.org/api/download";
```

The frontend sends:

```json
{
  "url": "https://youtube.com/watch?v=..."
}
```


### Supported synchronous success response

```json
{
  "status": "success",
  "title": "Video title",
  "quality": "1080p",
  "resolution": "1080x1920",
  "fps": "60",
  "video_codec": "h264",
  "audio_codec": "opus",
  "size_mb": "15.48",
  "download_url": "https://cybersabil-download.xubi.org/files/video.mkv"
}
```

### Supported asynchronous response

The frontend also supports a job response such as:

```json
{
  "status": "queued",
  "job_id": "abc123",
  "status_url": "https://cybersabil-download.xubi.org/api/status/abc123"
}
```

It will poll `status_url` until the backend returns success or failure.

## Security notes

- The frontend is intentionally public and contains no SSH key, API secret, or private access key.
- The UI validates YouTube URLs before sending them.
- The backend must still validate URLs independently and accept only supported YouTube URLs.
- The backend must never pass raw browser input directly to a shell command.
- Keep SSH/private keys only on administrator devices and the server; never in GitHub Pages code.
- Final file URLs should be HTTPS.

## Responsive behavior

The interface is designed for desktop, tablet, and mobile, including narrow screens down to 280 px, long video titles, reduced-motion preferences, keyboard focus, and safe-area footer spacing.
