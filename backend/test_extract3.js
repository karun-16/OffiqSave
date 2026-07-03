const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('debug.json', 'utf8'));

let images = [];

function extract(node) {
    if (!node) return;
    
    if (typeof node === 'string') {
        if (node.includes('image_versions2')) {
            try {
                const parsed = JSON.parse(node);
                extract(parsed);
            } catch(e) {}
        }
        return;
    }
    
    if (typeof node !== 'object') return;
    
    if (Array.isArray(node)) {
        for (let n of node) extract(n);
        return;
    }
    
    const keys = ['edge_sidecar_to_children', 'carousel_media', 'GraphSidecar', 'children', 'edges', 'items', 'media', 'node'];
    for (let k of keys) {
        if (node[k]) extract(node[k]);
    }
    
    if (node.image_versions2 && node.image_versions2.candidates) {
        let best = node.image_versions2.candidates[0];
        let max = (best.width || 0) * (best.height || 0);
        for(let c of node.image_versions2.candidates) {
             const area = (c.width||0)*(c.height||0);
             if (area > max) { max = area; best = c; }
        }
        images.push(best.url);
    }
    
    // Also traverse all object keys just in case
    for (let k of Object.keys(node)) {
        if (!keys.includes(k) && k !== 'image_versions2') {
            extract(node[k]);
        }
    }
}

extract(obj);
console.log(images);
