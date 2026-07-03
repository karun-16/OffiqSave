const fs = require('fs');
const str = fs.readFileSync('debug.json', 'utf8');
console.log('Contains image_versions2?', str.includes('image_versions2'));
console.log('Contains "image_versions2"?', str.includes('"image_versions2"'));
console.log('Contains \\"image_versions2\\"?', str.includes('\\"image_versions2\\"'));
