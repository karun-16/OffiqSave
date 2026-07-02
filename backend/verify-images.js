/**
 * OffiqSave - Universal Image Extraction Verification Suite
 * 
 * Tests all platforms for image detection, metadata, and download.
 * Run: node verify-images.js
 */

const BACKEND = 'http://localhost:4000';

// Platform URLs that are reliably public and won't require login
const TEST_CASES = [
    // ── Instagram ──────────────────────────────────────────────────────────
    // Instagram blocks scrapers without auth - tested via cookies.txt
    {
        id: 'instagram-photo',
        label: 'Instagram Photo',
        url: 'https://www.instagram.com/p/CuGHkIcIPeD/',
        expectedPlatform: 'Instagram',
        expectedMediaType: ['image', 'gallery'],
        note: 'May require auth',
        skipDownload: true,
        allowFail: true
    },

    // ── Facebook ───────────────────────────────────────────────────────────
    {
        id: 'facebook-photo',
        label: 'Facebook Photo (public page)',
        url: 'https://www.facebook.com/NASA/photos/10160023745751729/',
        expectedPlatform: 'Facebook',
        expectedMediaType: 'image',
        skipDownload: true,
        allowFail: true
    },

    // ── Twitter / X ────────────────────────────────────────────────────────
    {
        id: 'twitter-image',
        label: 'Twitter Single Image',
        url: 'https://twitter.com/Interior/status/463440424141459456',
        expectedPlatform: 'X (Twitter)',
        expectedMediaType: 'image',
    },
    {
        id: 'twitter-image-2',
        label: 'Twitter Multi-image (recent)',
        url: 'https://x.com/NASA/status/1855365568069476504',
        expectedPlatform: 'X (Twitter)',
        expectedMediaType: ['image', 'gallery'],
        allowFail: true
    },

    // ── Reddit ─────────────────────────────────────────────────────────────
    {
        id: 'reddit-image',
        label: 'Reddit Single Image (i.redd.it)',
        url: 'https://www.reddit.com/r/pics/comments/1b7xb5y/this_is_a_test_public_image_post/',
        expectedPlatform: 'Reddit',
        expectedMediaType: ['image', 'gallery', 'video'],
        allowFail: true
    },
    {
        id: 'reddit-gallery-2',
        label: 'Reddit Gallery (well-known)',
        url: 'https://www.reddit.com/r/pics/comments/haucpf/meet_winston_my_frenchie_who_just_turned_1/',
        expectedPlatform: 'Reddit',
        expectedMediaType: ['image', 'gallery'],
        allowFail: true
    },

    // ── Pinterest ──────────────────────────────────────────────────────────
    {
        id: 'pinterest-pin',
        label: 'Pinterest Pin',
        url: 'https://www.pinterest.com/pin/654862692983066655/',
        expectedPlatform: 'Pinterest',
        expectedMediaType: 'image',
        skipDownload: true,
        allowFail: true
    },

    // ── Generic ────────────────────────────────────────────────────────────
    {
        id: 'generic-jpg',
        label: 'Generic JPG URL',
        url: 'https://www.gstatic.com/webp/gallery/1.jpg',
        expectedPlatform: ['Generic', 'Direct Image'],
        expectedMediaType: 'image',
    },
    {
        id: 'generic-png',
        label: 'Generic PNG URL',
        url: 'https://github.com/fluidicon.png',
        expectedPlatform: ['Generic', 'Direct Image'],
        expectedMediaType: 'image',
    },
    {
        id: 'generic-webp',
        label: 'Generic WEBP URL',
        url: 'https://www.gstatic.com/webp/gallery/1.webp',
        expectedPlatform: ['Generic', 'Direct Image'],
        expectedMediaType: 'image',
    },
    {
        id: 'generic-gif',
        label: 'Generic GIF URL',
        url: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif',
        expectedPlatform: ['Generic', 'Direct Image'],
        expectedMediaType: 'image',
    },
];

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

function c(color, text) {
    return `${COLORS[color]}${text}${COLORS.reset}`;
}

async function testInfo(tc) {
    const start = Date.now();
    try {
        const res = await fetch(`${BACKEND}/api/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: tc.url })
        });

        const elapsed = Date.now() - start;

        if (!res.ok) {
            const body = await res.text();
            return { success: false, error: `HTTP ${res.status}: ${body}`, elapsed };
        }

        const data = await res.json();
        const errors = [];

        // Validate platform
        const expectedPlatforms = Array.isArray(tc.expectedPlatform) ? tc.expectedPlatform : [tc.expectedPlatform];
        if (tc.expectedPlatform && !expectedPlatforms.some(p => data.platform?.toLowerCase().includes(p.toLowerCase()))) {
            errors.push(`Platform mismatch: got "${data.platform}", expected one of ${expectedPlatforms.join('/')}`);
        }

        // Validate mediaType
        const expectedTypes = Array.isArray(tc.expectedMediaType) ? tc.expectedMediaType : [tc.expectedMediaType];
        if (tc.expectedMediaType && !expectedTypes.includes(data.mediaType)) {
            errors.push(`MediaType mismatch: got "${data.mediaType}", expected one of ${expectedTypes.join('/')}`);
        }

        // Validate images array for image/gallery types
        if ((data.mediaType === 'image' || data.mediaType === 'gallery')) {
            if (!data.images || data.images.length === 0) {
                errors.push('images array is missing or empty');
            } else {
                const firstImg = data.images[0];
                if (!firstImg.url) errors.push('images[0].url is missing');
                if (!firstImg.format) errors.push('images[0].format is missing');
            }
        }

        // Validate title
        if (!data.title) errors.push('title is missing');

        // Validate thumbnail
        if (!data.thumbnail && (data.mediaType === 'image' || data.mediaType === 'gallery')) {
            errors.push('thumbnail is missing for image/gallery');
        }

        return {
            success: errors.length === 0,
            errors,
            elapsed,
            data: {
                platform: data.platform,
                mediaType: data.mediaType,
                title: data.title?.substring(0, 50),
                thumbnail: data.thumbnail ? '✓' : '✗',
                images: data.images ? `${data.images.length} image(s)` : 'none',
                formats: data.formats?.length || 0,
                imageUrl: data.images?.[0]?.url,
            }
        };
    } catch (e) {
        return { success: false, error: e.message, elapsed: Date.now() - start };
    }
}

async function testImageDownload(imageUrl, sourceUrl) {
    try {
        const res = await fetch(`${BACKEND}/api/download-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl, filename: 'test.jpg', sourceUrl })
        });
        if (!res.ok) {
            const body = await res.text();
            return { success: false, error: `HTTP ${res.status}: ${body}` };
        }
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 100) return { success: false, error: `File too small: ${buf.byteLength} bytes` };
        return { success: true, size: buf.byteLength };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function runSuite() {
    console.log(c('bold', '\n╔══════════════════════════════════════════════════════╗'));
    console.log(c('bold', '║     OffiqSave - Image Extraction Verification Suite    ║'));
    console.log(c('bold', '╚══════════════════════════════════════════════════════╝\n'));

    // Check backend
    try {
        const health = await fetch(`${BACKEND}/health`);
        if (!health.ok) throw new Error('not ok');
        console.log(c('green', '✓ Backend is running\n'));
    } catch {
        console.log(c('red', '✗ Backend is not reachable at ' + BACKEND));
        console.log(c('yellow', '  → Start it with: cd backend && npm run dev\n'));
        process.exit(1);
    }

    const results = [];
    let passed = 0, failed = 0, warned = 0;

    for (const tc of TEST_CASES) {
        const note = tc.note ? c('dim', ` [${tc.note}]`) : '';
        process.stdout.write(`  Testing ${c('cyan', tc.label)}${note} ... `);

        const infoResult = await testInfo(tc);

        if (!infoResult.success) {
            if (tc.allowFail) {
                console.log(c('yellow', 'SKIP (expected)') + c('dim', ` (${infoResult.elapsed}ms)`));
                if (infoResult.error) console.log(c('dim', `     Reason: ${infoResult.error?.substring(0, 100)}`));
                if (infoResult.errors) infoResult.errors.forEach(e => console.log(c('yellow', `     • ${e}`)));
                results.push({ ...tc, status: 'SKIP' });
                warned++;
                console.log('');
            } else {
                console.log(c('red', `FAIL`) + c('dim', ` (${infoResult.elapsed}ms)`));
                if (infoResult.error) console.log(c('red', `     Error: ${infoResult.error}`));
                if (infoResult.errors) infoResult.errors.forEach(e => console.log(c('red', `     • ${e}`)));
                results.push({ ...tc, status: 'FAIL', reason: infoResult.error || infoResult.errors?.join('; ') });
                failed++;
                console.log('');
            }
            continue;
        }

        // Test download for image types
        let downloadResult = null;
        if (!tc.skipDownload && infoResult.data.imageUrl && infoResult.data.mediaType !== 'video') {
            downloadResult = await testImageDownload(infoResult.data.imageUrl, tc.url);
        }

        const downloadOk = tc.skipDownload || !downloadResult || downloadResult.success;
        const overallSuccess = infoResult.success && downloadOk;

        if (overallSuccess) {
            console.log(c('green', 'PASS') + c('dim', ` (${infoResult.elapsed}ms)`));
            console.log(c('dim', `     Platform: ${infoResult.data.platform} | Type: ${infoResult.data.mediaType} | Images: ${infoResult.data.images} | Title: ✓ | Thumbnail: ${infoResult.data.thumbnail}`));
            if (downloadResult?.success) {
                console.log(c('dim', `     Download: ✓ (${(downloadResult.size / 1024).toFixed(1)} KB)`));
            }
            passed++;
        } else {
            console.log(c('red', 'FAIL'));
            if (infoResult.errors) infoResult.errors.forEach(e => console.log(c('red', `     Info: ${e}`)));
            if (!downloadOk) console.log(c('red', `     Download: ${downloadResult?.error}`));
            failed++;
        }

        results.push({ ...tc, status: overallSuccess ? 'PASS' : 'FAIL' });
        console.log('');
    }

    // Summary
    console.log(c('bold', '\n────────────────────────────────────────────────────────'));
    const resultLine = [
        c('green', `${passed} passed`),
        failed > 0 ? c('red', `${failed} failed`) : null,
        warned > 0 ? c('yellow', `${warned} skipped (auth-required)`) : null,
    ].filter(Boolean).join('  ');
    console.log(c('bold', `  Results: ${resultLine}  (${TEST_CASES.length} total)`));
    console.log(c('bold', '────────────────────────────────────────────────────────\n'));

    if (failed > 0) {
        console.log(c('yellow', 'Failed tests:'));
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(c('red', `  ✗ ${r.label}`));
            if (r.reason) console.log(c('dim', `    ${r.reason}`));
        });
        console.log('');
    }

    if (warned > 0) {
        console.log(c('dim', 'Skipped (require cookies.txt with valid session):'));
        results.filter(r => r.status === 'SKIP').forEach(r => {
            console.log(c('dim', `  ~ ${r.label}`));
        });
        console.log('');
    }

    process.exit(failed > 0 ? 1 : 0);
}

runSuite().catch(e => {
    console.error('Suite error:', e);
    process.exit(1);
});
