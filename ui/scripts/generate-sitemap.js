import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define your routes here - add new routes as you create pages
const routes = [
  '/',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/employers',
  '/employers/signup',
  '/employers/login',
  '/pricing',
  '/upgrade',
  '/terms',
  '/privacy',
  '/cookies',
  '/reset-password',
  '/jobs'
];

const baseUrl = process.env.SITE_URL || 'https://kraftisium.xyz';
const apiBaseUrl = process.env.SITEMAP_API_URL || process.env.VITE_BFF_API_URL || 'https://api.kraftisium.xyz';
const apiVersion = process.env.VITE_BFF_API_VERSION || 'v1';
const MAX_JOB_URLS = 5000; // sitemap protocol caps a single file at 50k URLs; stay well under that

/** Best-effort fetch of open job ids so individual /jobs/:id pages (JobPosting
 * rich-result candidates) get discovered even if react-snap's crawl misses them.
 * Never throws — a build must not fail just because the API was unreachable. */
async function fetchJobUrlEntries() {
  const entries = [];
  let page = 1;
  let totalPages = 1;

  try {
    do {
      const res = await fetch(`${apiBaseUrl}/api/${apiVersion}/jobs?page=${page}&limit=100`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      for (const job of data.jobs || []) {
        entries.push({
          loc: `${baseUrl}/jobs/${job.id}`,
          lastmod: (job.updated_at || job.posted_at || new Date().toISOString()).split('T')[0],
          changefreq: 'daily',
          priority: '0.7',
        });
      }
      totalPages = data.total_pages || 1;
      page += 1;
    } while (page <= totalPages && entries.length < MAX_JOB_URLS);
  } catch (err) {
    console.warn('⚠️  Skipping dynamic /jobs/:id sitemap entries — could not reach BFF API:', err.message);
    return [];
  }

  return entries.slice(0, MAX_JOB_URLS);
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function generateSitemap() {
  const staticEntries = routes.map((route) => ({
    loc: route === '/' ? baseUrl : `${baseUrl}${route}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: route === '/' ? '1.0' : '0.8',
  }));

  const jobEntries = await fetchJobUrlEntries();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...jobEntries].map(urlEntry).join('\n')}
</urlset>`;

  // Ensure dist directory exists
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const publicDir = path.join(__dirname, '..', 'public');
  for (const outDir of [distDir, publicDir]) {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const sitemapPath = path.join(outDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    console.log(`✅ Sitemap written (${staticEntries.length} static + ${jobEntries.length} job URLs):`, sitemapPath);
  }
}

generateSitemap();
