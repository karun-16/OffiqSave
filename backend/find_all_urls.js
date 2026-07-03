const fs = require('fs');

async function fetchCandidateHeadAndSize(urlStr) {
    try {
        const res = await fetch(urlStr, { redirect: 'follow' });
        const buffer = await res.arrayBuffer();
        return buffer.byteLength;
    } catch (e) {
        return 0;
    }
}

function parseDimensions(url) {
    const match = url.match(/(?:p|s)(\d+)x(\d+)/);
    if (match) return { w: parseInt(match[1]), h: parseInt(match[2]) };
    return { w: null, h: null };
}

function getCropParams(url) {
    const match = url.match(/stp=c([\d\.]+)\.([\d\.]+)\.([\d\.]+)\.([\d\.]+)[a-z_]/);
    if (match) return `Crop: ${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
    if (url.includes('stp=c')) return 'Crop: Yes (other format)';
    return 'Crop: None';
}

const foundUrls = new Map();

async function run() {
    console.log('Loading debug.json...');
    const data = JSON.parse(fs.readFileSync('debug.json', 'utf8'));
    
    function traverse(node, currentPath, visited = new Set()) {
        if (!node) return;
        if (typeof node !== 'object') {
            if (typeof node === 'string' && node.startsWith('http') && (node.includes('.jpg') || node.includes('.webp') || node.includes('.png') || node.includes('.heic'))) {
                if (!foundUrls.has(node)) {
                    foundUrls.set(node, { paths: [] });
                }
                foundUrls.get(node).paths.push(currentPath);
            } else if (typeof node === 'string' && (node.startsWith('{') || node.startsWith('['))) {
                try {
                    const parsed = JSON.parse(node);
                    traverse(parsed, `${currentPath}_parsed_JSON`, visited);
                } catch(e) {}
            }
            return;
        }
        
        if (visited.has(node)) return;
        visited.add(node);
        
        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                traverse(node[i], `${currentPath}[${i}]`, visited);
            }
        } else {
            for (const key of Object.keys(node)) {
                traverse(node[key], `${currentPath}.${key}`, visited);
            }
        }
    }
    
    traverse(data, 'root');
    
    const results = [];
    
    let index = 0;
    const urlsToFetch = Array.from(foundUrls.keys());
    console.log(`Found ${urlsToFetch.length} unique URLs. Fetching byte sizes...`);
    
    for (const url of urlsToFetch) {
        index++;
        console.log(`Processing URL ${index}/${urlsToFetch.length}`);
        const paths = foundUrls.get(url).paths;
        const dims = parseDimensions(url);
        const crop = getCropParams(url);
        const byteSize = await fetchCandidateHeadAndSize(url);
        
        let aspectRatio = 'Unknown';
        if (dims.w && dims.h) {
            aspectRatio = (dims.w / dims.h).toFixed(2);
        }
        
        results.push({
            url: url,
            paths: paths,
            width: dims.w,
            height: dims.h,
            aspect_ratio: aspectRatio,
            crop_parameters: crop,
            byte_size: byteSize
        });
    }
    
    fs.writeFileSync('debug_output.json', JSON.stringify(results, null, 2));
    console.log('Saved to debug_output.json');
}

run();
