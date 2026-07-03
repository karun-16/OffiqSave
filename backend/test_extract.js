const fs = require('fs');
const html = fs.readFileSync('../debug/bot-instagram.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

let foundUrls = [];
function extract(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
        for (let n of node) extract(n);
        return;
    }
    const keys = ['edge_sidecar_to_children', 'carousel_media', 'GraphSidecar', 'children', 'edges', 'items', 'media', 'node'];
    for (let k of keys) {
        if (node[k]) extract(node[k]);
    }
    if (node.image_versions2 && node.image_versions2.candidates) {
        foundUrls.push(node.image_versions2.candidates[0].url);
    }
}

$('script[type="application/json"][data-sjs]').each((_, el) => {
    try {
        const jsonStr = $(el).html();
        if (jsonStr.includes('ScheduledServerJS')) {
            const data = JSON.parse(jsonStr);
            extract(data);
        }
    } catch (e) {
        console.error(e);
    }
});

console.log(foundUrls);
