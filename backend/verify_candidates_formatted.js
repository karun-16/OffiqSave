const fs = require('fs');
const path = require('path');

async function fetchCandidate(url, index) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const size = buffer.byteLength;
    return size;
}

function getPenalty(url) {
    let score = 0;
    if (url.includes('stp=c')) score += 100;
    if (url.match(/_p\d+x\d+/)) score += 50;
    if (url.match(/_s\d+x\d+/)) score += 50;
    if (url.includes('sh2')) score += 10;
    return score;
}

async function run() {
    try {
        const str = fs.readFileSync('debug.json', 'utf8');
        const data = JSON.parse(str);
        let carouselNodes = [];
        
        function extract(node) {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) {
                for (let n of node) extract(n);
                return;
            }
            if (node.image_versions2 && node.image_versions2.candidates) {
                carouselNodes.push(node);
            } else {
                const childKeys = ['edge_sidecar_to_children', 'carousel_media', 'GraphSidecar', 'children', 'edges', 'items', 'media', 'node'];
                for (let k of childKeys) {
                    if (node[k]) extract(node[k]);
                }
                for (let k of Object.keys(node)) {
                    if (!childKeys.includes(k) && k !== 'image_versions2' && k !== 'candidates') {
                        if (typeof node[k] === 'object' || typeof node[k] === 'string') {
                            if (typeof node[k] === 'string') {
                                try { extract(JSON.parse(node[k])); } catch(e){}
                            } else {
                                extract(node[k]);
                            }
                        }
                    }
                }
            }
        }
        
        extract(data);
        const uniqueNodes = Array.from(new Map(carouselNodes.map(n => [n.id || JSON.stringify(n.image_versions2), n])).values());
        
        if (uniqueNodes.length > 0) {
            const firstImage = uniqueNodes[0];
            const candidates = firstImage.image_versions2.candidates;
            
            // Replicate Extractor sorting
            const parsedCandidates = candidates.map(c => {
                let w = c.width || 0;
                let h = c.height || 0;
                if (w === 0 || h === 0) {
                    const match = c.url.match(/(?:p|s)(\d+)x(\d+)/);
                    if (match) {
                        w = parseInt(match[1], 10);
                        h = parseInt(match[2], 10);
                    } else if (!c.url.includes('150x150')) {
                        w = 2000; h = 2000;
                    }
                }
                return { url: c.url, width: w, height: h, area: w * h, penalty: getPenalty(c.url) };
            });
            
            parsedCandidates.sort((a, b) => {
                if (a.penalty !== b.penalty) return a.penalty - b.penalty;
                return b.area - a.area;
            });
            
            const selectedUrl = parsedCandidates[0].url;

            for (let i = 0; i < candidates.length; i++) {
                const c = candidates[i];
                let w = c.width || 'MISSING';
                let h = c.height || 'MISSING';
                let size = 0;
                try {
                    size = await fetchCandidate(c.url, i);
                } catch(e) {}
                
                const selected = c.url === selectedUrl ? 'YES' : 'NO';
                console.log(`Candidate ${i}`);
                console.log(`URL: ${c.url}`);
                console.log(`Width: ${w}`);
                console.log(`Height: ${h}`);
                console.log(`Byte Size: ${size}`);
                console.log(`Selected: ${selected}\n`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
