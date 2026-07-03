const fs = require('fs');
const html = fs.readFileSync('../debug/bot-instagram.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

$('script').each((_, el) => {
    const str = $(el).html();
    if (str && str.includes('ScheduledServerJS') && str.includes('carousel_media')) {
        fs.writeFileSync('debug.json', str);
        console.log("Wrote debug.json");
    }
});
