const fs = require('fs');
const html = fs.readFileSync('debug/instagram.html', 'utf8');

const cheerio = require('cheerio');
const $ = cheerio.load(html);

console.log("--- OpenGraph Tags ---");
$('meta[property^="og:"]').each((_, el) => {
    console.log(`${$(el).attr('property')} = ${$(el).attr('content')}`);
});

console.log("\n--- Twitter Tags ---");
$('meta[name^="twitter:"]').each((_, el) => {
    console.log(`${$(el).attr('name')} = ${$(el).attr('content')}`);
});
