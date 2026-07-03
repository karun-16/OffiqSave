const fs = require('fs');

function fetchCandidateHeadAndSize(urlStr) {
    return new Promise(async (resolve) => {
        try {
            const res = await fetch(urlStr, { redirect: 'follow' });
            const buffer = await res.arrayBuffer();
            resolve({
                status: res.status,
                contentType: res.headers.get('content-type') || 'unknown',
                contentLength: res.headers.get('content-length') || buffer.byteLength,
                downloadedBytes: buffer.byteLength,
                redirected: res.redirected,
                finalUrl: res.url
            });
        } catch (e) {
            resolve({ error: String(e) });
        }
    });
}

function parseDimensions(url, w, h) {
    if (w && h) return { w, h };
    const match = url.match(/(?:p|s)(\d+)x(\d+)/);
    if (match) return { w: parseInt(match[1]), h: parseInt(match[2]) };
    return { w: 0, h: 0 };
}

function getPenalty(url) {
    let score = 0;
    if (url.includes('stp=c')) score -= 1000;
    if (url.match(/_p\d+x\d+/)) score -= 500;
    if (url.match(/_s\d+x\d+/)) score -= 500;
    if (url.includes('sh2')) score -= 100;
    
    if (url.includes('150x150')) score -= 2000;
    return score;
}

async function run() {
    console.log('Loading debug.json...');
    const data = JSON.parse(fs.readFileSync('debug.json', 'utf8'));
    
    let carouselNodes = [];
    function extract(node, visited = new Set()) {
        if (!node || typeof node !== 'object') return;
        if (visited.has(node)) return;
        visited.add(node);
        
        if (Array.isArray(node)) {
            for (let n of node) extract(n, visited);
            return;
        }
        
        if (node.image_versions2 && node.image_versions2.candidates) {
            carouselNodes.push(node);
        }
        if (node.display_resources) {
            carouselNodes.push(node);
        }

        const childKeys = ['edge_sidecar_to_children', 'carousel_media', 'GraphSidecar', 'children', 'edges', 'items', 'media', 'node'];
        for (let k of childKeys) {
            if (node[k]) extract(node[k], visited);
        }
        for (let k of Object.keys(node)) {
            if (!childKeys.includes(k) && k !== 'image_versions2' && k !== 'candidates' && k !== 'display_resources') {
                if (typeof node[k] === 'object' || typeof node[k] === 'string') {
                    if (typeof node[k] === 'string') {
                        try { extract(JSON.parse(node[k]), visited); } catch(e){}
                    } else {
                        extract(node[k], visited);
                    }
                }
            }
        }
    }
    
    extract(data);
    
    const uniqueNodes = Array.from(new Map(carouselNodes.map(n => [n.id || JSON.stringify(n.image_versions2 || n.display_resources), n])).values());
    console.log(`Found ${uniqueNodes.length} images.`);
    
    if (uniqueNodes.length > 0) {
        for (let imgIdx = 0; imgIdx < uniqueNodes.length; imgIdx++) {
            console.log(`\n\n========================================================`);
            console.log(`ANALYZING IMAGE ${imgIdx}`);
            console.log(`========================================================\n`);
            const firstImage = uniqueNodes[imgIdx];
            
            let candidates = [];
            if (firstImage.image_versions2 && firstImage.image_versions2.candidates) {
                candidates = candidates.concat(firstImage.image_versions2.candidates);
            }
            if (firstImage.display_resources) {
                candidates = candidates.concat(firstImage.display_resources);
            }
            if (firstImage.display_url) {
                candidates.push({ url: firstImage.display_url, width: firstImage.dimensions?.width, height: firstImage.dimensions?.height });
            }
            
            candidates = Array.from(new Map(candidates.map(c => [c.url || c.src, c])).values());

            console.log(`Found ${candidates.length} candidates for image ${imgIdx}.\n`);
            
            let scoredCandidates = [];

            for (let i = 0; i < candidates.length; i++) {
                const c = candidates[i];
                const url = c.url || c.src;
                if (!url) continue;

                console.log(`----------------------------------------`);
                console.log(`Candidate ${i}`);
                console.log(`URL: ${url}`);
                
                const dims = parseDimensions(url, c.width || c.config_width, c.height || c.config_height);
                console.log(`Width: ${c.width || c.config_width || 'MISSING'}`);
                console.log(`Height: ${c.height || c.config_height || 'MISSING'}`);
                console.log(`Estimated Resolution: ${dims.w}x${dims.h}`);
                console.log(`File Extension: ${url.match(/\\.([a-z0-9]+)\\?/i)?.[1] || 'UNKNOWN'}`);
                
                const crop = url.includes('stp=c');
                const resize = /_(p|s)\d+x\d+/.test(url);
                const jpegRecomp = url.includes('dst-jpg') || url.includes('dst-jpegr');
                const webp = url.includes('webp');
                const avif = url.includes('avif');
                
                console.log(`Contains Crop Parameters: ${crop ? 'YES' : 'NO'}`);
                console.log(`Contains Resize Parameters: ${resize ? 'YES' : 'NO'}`);
                console.log(`Contains JPEG Recompression: ${jpegRecomp ? 'YES' : 'NO'}`);
                console.log(`Contains WebP: ${webp ? 'YES' : 'NO'}`);
                console.log(`Contains AVIF: ${avif ? 'YES' : 'NO'}`);
                console.log(`URL Length: ${url.length}`);
                
                const net = await fetchCandidateHeadAndSize(url);
                console.log(`HTTP Status: ${net.status || 'ERROR'}`);
                if (!net.error) {
                    console.log(`Content-Type: ${net.contentType}`);
                    console.log(`Content-Length: ${net.contentLength}`);
                    console.log(`Downloaded Bytes: ${net.downloadedBytes}`);
                    console.log(`Redirect Count: ${net.redirected ? 1 : 0}`);
                    console.log(`Final URL: ${net.finalUrl}`);
                } else {
                    console.log(`Error: ${net.error}`);
                }
                
                let baseScore = net.downloadedBytes || 0;
                let penalty = getPenalty(url);
                let score = baseScore + (penalty * 100);
                
                let reason = [];
                if (crop) reason.push("Cropped");
                if (resize) reason.push("Resized");
                if (url.includes('sh2')) reason.push("Sharpened");
                if (reason.length === 0) reason.push("Original");
                
                scoredCandidates.push({
                    index: i,
                    url: url,
                    finalUrl: net.finalUrl,
                    width: dims.w,
                    height: dims.h,
                    bytes: net.downloadedBytes,
                    score: score,
                    reason: reason.join(', ')
                });
            }
            
            console.log(`\n=================================================`);
            console.log(`RANKING IMAGE ${imgIdx}`);
            console.log(`=================================================\n`);
            
            scoredCandidates.sort((a, b) => b.score - a.score);
            
            for (let sc of scoredCandidates) {
                console.log(`Candidate ${sc.index} | Score: ${sc.score} | Reason: ${sc.reason} | Bytes: ${sc.bytes}`);
            }
            
            const best = scoredCandidates[0];
            console.log(`\n=================================================`);
            console.log(`Selected Candidate`);
            console.log(`Original URL: ${best.url}`);
            console.log(`Final URL: ${best.finalUrl}`);
            console.log(`Resolution: ${best.width}x${best.height}`);
            console.log(`Content-Length: ${best.bytes}`);
            console.log(`Score: ${best.score}`);
            console.log(`Reason Selected: ${best.reason} (Highest Score)`);
            console.log(`=================================================\n`);
        }
    }
}

run();
