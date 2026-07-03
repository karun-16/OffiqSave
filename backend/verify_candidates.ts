import * as fs from 'fs';
import * as path from 'path';

async function fetchCandidate(url: string, index: number) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const size = buffer.byteLength;
    const buf = Buffer.from(buffer);
    fs.writeFileSync(`candidate_${index}.jpg`, buf);
    return size;
}

async function run() {
    try {
        const str = fs.readFileSync('debug.json', 'utf8');
        const data = JSON.parse(str);
        let carouselNodes: any[] = [];
        
        function extract(node: any) {
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
                        if (typeof node[k] === 'object' || typeof node[key] === 'string') {
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
        
        // Remove duplicates by ID if possible
        const uniqueNodes = Array.from(new Map(carouselNodes.map(n => [n.id || JSON.stringify(n.image_versions2), n])).values());
        
        console.log(`Found ${uniqueNodes.length} unique images in carousel.`);
        if (uniqueNodes.length > 0) {
            const firstImage = uniqueNodes[0];
            const candidates = firstImage.image_versions2.candidates;
            console.log(`Inspecting ${candidates.length} candidates for the first image:\n`);
            
            for (let i = 0; i < candidates.length; i++) {
                const c = candidates[i];
                console.log(`Candidate ${i}:`);
                console.log(`URL: ${c.url}`);
                console.log(`Reported Width: ${c.width || 'MISSING'}`);
                console.log(`Reported Height: ${c.height || 'MISSING'}`);
                
                try {
                    const size = await fetchCandidate(c.url, i);
                    console.log(`File Size: ${size} bytes`);
                } catch(e) {
                    console.log(`Download Failed: ${e}`);
                }
                console.log('--------------------------------------------------');
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
