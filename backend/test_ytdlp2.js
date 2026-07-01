const ytDlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log('Testing Instagram Carousel with cookies.txt...');
        const cookiesPath = path.join(__dirname, 'cookies.txt');
        const igCarousel = await ytDlp('https://www.instagram.com/p/DB1W9_XN4uR/', {
            dumpSingleJson: true,
            noWarnings: true,
            cookies: cookiesPath
        });
        fs.writeFileSync('ig_carousel.json', JSON.stringify(igCarousel, null, 2));
        console.log('Saved ig_carousel.json');
    } catch (e) {
        console.error('Instagram Error', e);
    }
}
run();
