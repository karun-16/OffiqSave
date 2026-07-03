const fs = require('fs');
const html = fs.readFileSync('debug/runtime-instagram.html', 'utf8');
const matches = html.match(/(https?:\/\/[^\"]+)/g);
if (matches) {
    const unique = Array.from(new Set(matches)).filter(m => !m.includes('w3.org') && !m.includes('fbcdn.net'));
    console.log(unique.slice(0, 50));
}
