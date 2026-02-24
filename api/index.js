const YTDlpWrap = require('yt-dlp-wrap');

// Cache the binary in Vercel's writable /tmp
const ytdlpPath = '/tmp/yt-dlp';
let ytdlp = null;

async function getYtdlp() {
  if (!ytdlp) {
    ytdlp = new YTDlpWrap(ytdlpPath);
    // Ensure binary exists (Vercel's /tmp is ephemeral)
    try {
      await ytdlp.getBinaryPath();
    } catch (e) {
      // If not found, download it
      await YTDlpWrap.downloadBinary(ytdlpPath);
    }
  }
  return ytdlp;
}

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  try {
    const ytdlp = await getYtdlp();

    // Get direct URL for best video up to 720p (adjust format as needed)
    const format = 'bv[height<=720]+ba/best[height<=720]/best';
    const output = await ytdlp.execPromise([
      url,
      '--print', 'json',
      '-f', format,
      '--no-playlist'
    ]);

    const lines = output.trim().split('\n');
    const jsonLines = lines.filter(line => line.startsWith('{'));
    if (jsonLines.length === 0) {
      throw new Error('No output from yt-dlp');
    }

    const info = JSON.parse(jsonLines[0]);
    if (!info.url) {
      throw new Error('No download URL in yt-dlp response');
    }

    res.status(200).json({ url: info.url });
  } catch (err) {
    console.error('yt-dlp error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch download URL' });
  }
};