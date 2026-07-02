const fetch = require('node-fetch');

async function checkEmbed() {
    const r = await fetch('https://www.instagram.com/p/DaQKxnwkWt5/embed/captioned/');
    const html = await r.text();
    
    // Look for TimeSliceImpl embedded data
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs) || [];
    let foundJson = false;
    for (const script of scriptMatches) {
        if (script.includes('window.__additionalDataLoaded(')) {
            console.log('Found __additionalDataLoaded');
            const jsonStr = script.match(/window\.__additionalDataLoaded\([^,]+,\s*({.*})\);/s);
            if (jsonStr) {
                const data = JSON.parse(jsonStr[1]);
                console.log(data);
                foundJson = true;
            }
        }
    }
    if (!foundJson) {
        require('fs').writeFileSync('debug/embed.html', html);
        console.log('Saved to debug/embed.html');
    }
}

checkEmbed();
