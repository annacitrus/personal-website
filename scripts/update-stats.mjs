// Refreshes stats.json with the current follower count and the view count
// of every post listed under "views". Run by .github/workflows/update-stats.yml.
import { readFile, writeFile } from 'node:fs/promises';

const HANDLE = 'annacitrus';
const STATS_PATH = new URL('../stats.json', import.meta.url);
const apiKey = process.env.SCRAPECREATORS_API_KEY;

if (!apiKey) {
    console.error('SCRAPECREATORS_API_KEY is not set');
    process.exit(1);
}

async function scrape(path, params) {
    const url = `https://api.scrapecreators.com${path}?${new URLSearchParams(params)}`;
    const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    return response.json();
}

const stats = JSON.parse(await readFile(STATS_PATH, 'utf8'));
let failures = 0;

try {
    const profile = await scrape('/v1/instagram/profile', { handle: HANDLE });
    stats.followers = profile.data.user.edge_followed_by.count;
} catch (error) {
    failures++;
    console.error(`followers: ${error.message}`);
}

for (const shortcode of Object.keys(stats.views)) {
    try {
        const post = await scrape('/v1/instagram/post', { url: `https://www.instagram.com/p/${shortcode}/` });
        stats.views[shortcode] = post.data.xdt_shortcode_media.video_play_count;
    } catch (error) {
        failures++;
        console.error(`${shortcode}: ${error.message}`);
    }
}

await writeFile(STATS_PATH, JSON.stringify(stats, null, 2) + '\n');
console.log(stats);

// Keep whatever refreshed, but fail the run if nothing did so the breakage is visible.
if (failures === Object.keys(stats.views).length + 1) process.exit(1);
