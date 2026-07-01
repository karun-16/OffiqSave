const ytDlp = require('yt-dlp-exec');
const fs = require('fs');

async function run() {
    try {
        console.log('Testing Twitter Image...');
        const twImage = await ytDlp('https://x.com/SpaceX/status/1780410766157152643', {
            dumpSingleJson: true,
            noWarnings: true
        });
        fs.writeFileSync('tw_image.json', JSON.stringify(twImage, null, 2));
        console.log('Saved tw_image.json');
    } catch (e) {
        console.error('Twitter Error', e);
    }

    try {
        console.log('Testing Instagram Carousel...');
        // C:\EnclaveEdge\OffiqSave\cookies.txt might not exist, but backend might have it. Let's use cookiesFromBrowser: chrome
        const igCarousel = await ytDlp('https://www.instagram.com/p/DB1W9_XN4uR/', {
            dumpSingleJson: true,
            noWarnings: true,
            cookiesFromBrowser: 'chrome'
        });
        fs.writeFileSync('ig_carousel.json', JSON.stringify(igCarousel, null, 2));
        console.log('Saved ig_carousel.json');
    } catch (e) {
        console.error('Instagram Error', e);
    }
}
run();
