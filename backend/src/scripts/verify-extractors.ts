import { ExtractionRouter } from '../services/ExtractionRouter';
import { GenericMediaHandler } from '../services/handlers/PlatformHandlers';
import { InstagramExtractor } from '../services/extractors/InstagramExtractor';

// Helper to generate fake candidates
function genCandidates(id: string) {
    return [
        { url: `https://img.url/${id}_small.jpg`, width: 150, height: 150 },
        { url: `https://img.url/${id}_medium.jpg`, width: 640, height: 640 },
        { url: `https://img.url/${id}_large.jpg`, width: 1440, height: 1800 }
    ];
}

const originalFetch = global.fetch;
global.fetch = async (url: any, options: any) => {
    const urlStr = url.toString();
    
    // Test 1: Single Image (using __NEXT_DATA__)
    if (urlStr.includes('/p/TEST1_SINGLE/')) {
        const nextData = {
            props: { pageProps: { routeProps: { items: [ 
                { id: 'img1', image_versions2: { candidates: genCandidates('single') } }
            ] } } }
        };
        return {
            status: 200, ok: true,
            headers: new Headers({'content-type': 'text/html'}),
            text: async () => `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></head></html>`
        } as any;
    }
    
    // Test 2: Carousel 2 images (using Embedded JSON)
    if (urlStr.includes('/p/TEST2_CAROUSEL2/')) {
        const edges = [
            { node: { id: 'c2_1', image_versions2: { candidates: genCandidates('c2_1') } } },
            { node: { id: 'c2_2', image_versions2: { candidates: genCandidates('c2_2') } } }
        ];
        const json = { __typename: "XDTGraphSidecar", edge_sidecar_to_children: { edges } };
        return {
            status: 200, ok: true,
            headers: new Headers({'content-type': 'text/html'}),
            text: async () => `<html><body><script>var x = {"xdt_shortcode_media":${JSON.stringify(json)}};</script></body></html>`
        } as any;
    }
    
    // Test 3: Carousel 10 images (using window._sharedData)
    if (urlStr.includes('/p/TEST3_CAROUSEL10/')) {
        const edges = Array.from({length: 10}, (_, i) => ({
            node: { id: `c10_${i}`, image_versions2: { candidates: genCandidates(`c10_${i}`) } }
        }));
        const sharedData = {
            entry_data: { PostPage: [ { graphql: { shortcode_media: { edge_sidecar_to_children: { edges } } } } ] }
        };
        return {
            status: 200, ok: true,
            headers: new Headers({'content-type': 'text/html'}),
            text: async () => `<html><head><script type="text/javascript">window._sharedData = ${JSON.stringify(sharedData)};</script></head></html>`
        } as any;
    }
    
    // Test 4: Video post (using application/ld+json)
    if (urlStr.includes('/p/TEST4_VIDEO/')) {
        const ldJson = { "@type": "VideoObject", "contentUrl": "https://vid.url" };
        return {
            status: 200, ok: true,
            headers: new Headers({'content-type': 'text/html'}),
            text: async () => `<html><head><script type="application/ld+json">${JSON.stringify(ldJson)}</script></head></html>`
        } as any;
    }
    
    // Test 5: Reel (url detection handles this, but lets mock html anyway)
    if (urlStr.includes('/reel/TEST5_REEL/')) {
        return {
            status: 200, ok: true,
            headers: new Headers({'content-type': 'text/html'}),
            text: async () => `<html><head><meta property="og:video" content="https://vid.url"/></head></html>`
        } as any;
    }

    return originalFetch(url, options);
};

const testCases = [
    { name: 'Test 1: Single Image', url: 'https://www.instagram.com/p/TEST1_SINGLE/', expectedType: 'IMAGE', expectedCount: 1 },
    { name: 'Test 2: Carousel (2)', url: 'https://www.instagram.com/p/TEST2_CAROUSEL2/', expectedType: 'GALLERY', expectedCount: 2 },
    { name: 'Test 3: Carousel (10)', url: 'https://www.instagram.com/p/TEST3_CAROUSEL10/', expectedType: 'GALLERY', expectedCount: 10 },
    { name: 'Test 4: Video Post', url: 'https://www.instagram.com/p/TEST4_VIDEO/', expectedType: 'VIDEO', expectedCount: 0 },
    { name: 'Test 5: Reel', url: 'https://www.instagram.com/reel/TEST5_REEL/', expectedType: 'VIDEO', expectedCount: 0 }
];

async function runTests() {
    console.log('=== INSTAGRAM NATIVE EXTRACTOR VERIFICATION ===\n');
    let passed = 0;
    
    class MockHandler extends GenericMediaHandler {
        async extractWithYtDlp(url: string) {
            return {
                mediaType: 'VIDEO' as any,
                title: 'Mock Video',
                author: 'Mock',
                thumbnail: '',
                duration: 10,
                source: 'yt-dlp'
            };
        }
    }
    const handler = new MockHandler();

    for (const test of testCases) {
        console.log(`\n>>> RUNNING: ${test.name}`);
        try {
            const result = await ExtractionRouter.route(test.url, handler);
            
            let ok = true;
            if (result.mediaType !== test.expectedType) {
                console.log(`FAIL: Expected ${test.expectedType}, got ${result.mediaType}`);
                ok = false;
            }
            if (test.expectedType === 'IMAGE' || test.expectedType === 'GALLERY') {
                if (!result.images || result.images.length !== test.expectedCount) {
                    console.log(`FAIL: Expected ${test.expectedCount} images, got ${result.images?.length || 0}`);
                    ok = false;
                }
                
                // Verify original resolution
                if (result.images) {
                    for (let i=0; i<result.images.length; i++) {
                        const img = result.images[i];
                        if (img.width !== 1440 || img.height !== 1800) {
                            console.log(`FAIL: Image ${i} has wrong resolution: ${img.width}x${img.height}. Expected 1440x1800.`);
                            ok = false;
                        }
                        if (!img.downloadUrl || !img.filename) {
                            console.log(`FAIL: Image ${i} missing downloadUrl or filename.`);
                            ok = false;
                        }
                    }
                }
            }
            
            if (ok) {
                console.log(`PASS: ${test.name}`);
                passed++;
            }
        } catch (e: any) {
            console.log(`FAIL: Exception - ${e.message}`);
        }
    }
    console.log(`\nFINAL RESULTS: ${passed}/${testCases.length} PASSED`);
}

runTests().catch(console.error).finally(() => { global.fetch = originalFetch; });
