// build.js — reads posts/*.md, regenerates index.html and feed.xml
// Usage: node build.js

const fs   = require('fs');
const path = require('path');

const SITE_URL  = 'https://RA737code.github.io/the-thunder'; // <-- set once
const POSTS_DIR = 'posts';

// ─── frontmatter parser ──────────────────────────────────────────────────────

function parseFrontmatter(src) {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

// ─── load entries from posts/ ────────────────────────────────────────────────

const entries = fs.readdirSync(POSTS_DIR)
  .filter(f => f.endsWith('.md'))
  .map(filename => {
    const date = path.basename(filename, '.md');
    const src  = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
    return { date, ...parseFrontmatter(src) };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

// ─── helpers ─────────────────────────────────────────────────────────────────

function displayDate(dateStr, type) {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (type === 'monthly') {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function rfcDate(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toUTCString();
}

function esc(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── HTML rendering ───────────────────────────────────────────────────────────

function renderEntry(entry) {
  const date = displayDate(entry.date, entry.type);

  // standalone aphorism — just date and one line
  if (entry.type === 'note') {
    return `  <div class="entry">
    <div class="entry-date">${date}</div>
    <p>${entry.text}</p>
  </div>`;
  }

  // monthly issue
  let html = `  <div class="entry">
    <div class="entry-date">${date}</div>`;

  // song
  if (entry.song) {
    const songTitle = entry.song_link
      ? `<a href="${entry.song_link}" target="_blank">${entry.song}</a>`
      : entry.song;
    html += `\n\n    <div class="entry-song">
      <span class="label">song</span><br>
      ${entry.song_art ? `<img class="album-art" src="attachments/${entry.song_art}" alt="">` : ''}
      ${songTitle}<br>
      <span class="note">${entry.song_note}</span>
    </div>`;
  }

  // meal
  if (entry.meal) {
    html += `\n\n    <div class="entry-meal">
      <span class="label">meal</span><br>
      ${entry.meal}
    </div>`;
  }

  // image of the month
  if (entry.image) {
    html += `\n\n    <div class="entry-image-section">
      <span class="label">image</span><br>
      <img class="entry-img" src="attachments/${entry.image}" alt="">
      ${entry.image_note ? `<p class="note">${entry.image_note}</p>` : ''}
    </div>`;
  }

  // book
  if (entry.book) {
    html += `\n\n    <div class="entry-book">
      <span class="label">book</span><br>
      ${entry.book} — <span class="note-inline">${entry.book_author}</span><br>
      <span class="note">${entry.book_note}</span>
    </div>`;
  }

  // aphorism within the monthly issue
  if (entry.aphorism) {
    html += `\n\n    <div class="entry-aphorism">
      <span class="label">aphorism</span><br>
      <span class="note">${entry.aphorism}</span>
    </div>`;
  }

  html += `\n  </div>`;
  return html;
}

const body = entries
  .map(renderEntry)
  .join('\n\n  <hr class="divider">\n\n');

// ─── write index.html ─────────────────────────────────────────────────────────

fs.writeFileSync('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Thunder</title>
  <link rel="stylesheet" href="style.css">
  <link rel="alternate" type="application/rss+xml" title="The Thunder" href="feed.xml">
</head>
<body>

  <h1><a href="/the-thunder/">The Thunder</a></h1>

  ${body}

  <a href="feed.xml" class="rss-link">rss</a>

</body>
</html>
`);
console.log('wrote index.html');

// ─── write feed.xml ───────────────────────────────────────────────────────────

function rssItem(entry) {
  const date = displayDate(entry.date, entry.type);
  let description;
  if (entry.type === 'note') {
    description = esc(entry.text);
  } else {
    description = [
      entry.song      ? `<p><strong>song</strong><br>${esc(entry.song)}<br><em>${esc(entry.song_note)}</em></p>` : '',
      entry.meal      ? `<p><strong>meal</strong><br>${esc(entry.meal)}</p>` : '',
      entry.book      ? `<p><strong>book</strong><br>${esc(entry.book)} — ${esc(entry.book_author)}<br><em>${esc(entry.book_note)}</em></p>` : '',
      entry.aphorism  ? `<p><em>${esc(entry.aphorism)}</em></p>` : '',
    ].filter(Boolean).join('\n');
  }
  return `    <item>
      <title>${esc(date)}</title>
      <link>${SITE_URL}/#${entry.date}</link>
      <guid isPermaLink="false">the-thunder-${entry.date}</guid>
      <pubDate>${rfcDate(entry.date)}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
}

fs.writeFileSync('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Thunder</title>
    <link>${SITE_URL}</link>
    <description>song. meal. something.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>

${entries.map(rssItem).join('\n\n')}

  </channel>
</rss>
`);
console.log('wrote feed.xml');
