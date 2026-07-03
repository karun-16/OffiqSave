const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

async function download(url, dest) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
    return {
        originalUrl: url,
        finalUrl: res.url,
        contentLength: res.headers.get('content-length') || buffer.byteLength,
        buffer: Buffer.from(buffer)
    };
}

function getSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Helper to get image dimensions
function getDimensions(buffer) {
    // Quick hack for JPEG dimensions
    let i = 0;
    if (buffer[i] === 0xFF && buffer[i+1] === 0xD8) {
        i += 4;
        while (i < buffer.length) {
            if (buffer[i] !== 0xFF) break;
            const marker = buffer[i+1];
            const length = (buffer[i+2] << 8) + buffer[i+3];
            if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
                const h = (buffer[i+5] << 8) + buffer[i+6];
                const w = (buffer[i+7] << 8) + buffer[i+8];
                return { width: w, height: h };
            }
            i += length + 2;
        }
    }
    return { width: 'Unknown', height: 'Unknown' };
}

async function run() {
    try {
        const data = JSON.parse(fs.readFileSync('debug.json', 'utf8'));
        
        let firstImageNode = null;
        function findFirstImage(node) {
            if (!node || typeof node !== 'object') return;
            if (node.image_versions2 && node.image_versions2.candidates) {
                if (!firstImageNode) firstImageNode = node;
                return;
            }
            const keys = ['edge_sidecar_to_children', 'carousel_media', 'GraphSidecar', 'children', 'edges', 'items', 'media', 'node'];
            for (let k of keys) {
                if (node[k]) findFirstImage(node[k]);
            }
            if (Array.isArray(node)) {
                for (let n of node) findFirstImage(n);
            }
        }
        
        findFirstImage(data);
        
        if (!firstImageNode) {
            console.log("Could not find image 1 in debug.json.");
            return;
        }
        
        const candidate0Url = firstImageNode.image_versions2.candidates[0].url;
        
        console.log("Downloading candidate0.jpg...");
        const c0 = await download(candidate0Url, 'candidate0.jpg');
        const c0Dims = getDimensions(c0.buffer);
        const c0Hash = getSha256(c0.buffer);
        
        console.log(`\n--- Candidate 0 ---`);
        console.log(`Original URL: ${c0.originalUrl}`);
        console.log(`Final redirected URL: ${c0.finalUrl}`);
        console.log(`Content-Length: ${c0.contentLength}`);
        console.log(`Image Width: ${c0Dims.width}`);
        console.log(`Image Height: ${c0Dims.height}`);
        console.log(`SHA256: ${c0Hash}`);
        
        // Now get the URL OffiqSave is currently selecting
        // Using our recently modified extractor code via test
        const { InstagramExtractor } = require('./build/services/extractors/InstagramExtractor.js');
        const igExtractorUrl = 'https://www.instagram.com/p/DaQKxnwkWt5/'; 
        console.log(`\nExtracting via OffiqSave logic...`);
        const result = await InstagramExtractor.extract(igExtractorUrl);
        
        const offiqUrl = result.images[0].downloadUrl;
        
        console.log("Downloading offiqsave.jpg...");
        const offiq = await download(offiqUrl, 'offiqsave.jpg');
        const offiqDims = getDimensions(offiq.buffer);
        const offiqHash = getSha256(offiq.buffer);
        
        console.log(`\n--- OffiqSave Selected Image ---`);
        console.log(`Original URL: ${offiq.originalUrl}`);
        console.log(`Final redirected URL: ${offiq.finalUrl}`);
        console.log(`Content-Length: ${offiq.contentLength}`);
        console.log(`Image Width: ${offiqDims.width}`);
        console.log(`Image Height: ${offiqDims.height}`);
        console.log(`SHA256: ${offiqHash}`);
        
        console.log(`\n--- Comparison ---`);
        if (c0Hash === offiqHash) {
            console.log(`MATCH: YES. The hashes match.`);
            console.log(`Conclusion: The parser is correct. The remaining crop (if any) originates from Instagram itself.`);
        } else {
            console.log(`MATCH: NO. The hashes differ.`);
            console.log(`OffiqSave Alternate URL Source: ${offiq.originalUrl}`);
            
            // Try to find where it came from
            let foundPath = 'Unknown';
            function searchPath(node, targetUrl, path) {
                if (!node || typeof node !== 'object') return;
                for (let k of Object.keys(node)) {
                    if (typeof node[k] === 'string' && node[k] === targetUrl) {
                        foundPath = `${path}.${k}`;
                        return;
                    } else if (typeof node[k] === 'object') {
                        searchPath(node[k], targetUrl, `${path}.${k}`);
                    }
                }
            }
            searchPath(data, offiqUrl, 'root');
            console.log(`The alternate URL came from: ${foundPath}`);
        }
        
    } catch (e) {
        console.error(e);
    }
}

run();
