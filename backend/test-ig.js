const fetch = require('node-fetch');

async function testUrl(url) {
    console.log(`\nTesting ${url}`);
    const r = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        }
    });
    const html = await r.text();
    console.log('Status:', r.status);
    console.log('Length:', html.length);
    console.log('Preview:', html.substring(0, 200));
}

testUrl('https://www.instagram.com/p/DaQKxnwkWt5/?__a=1&__d=dis');
testUrl('https://www.instagram.com/p/C-h1R0rJ6k8/?__a=1&__d=dis');
