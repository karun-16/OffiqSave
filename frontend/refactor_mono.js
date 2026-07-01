const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove background glows
content = content.replace(
  /<div className="absolute inset-0 bg-glow-top w-full h-full pointer-events-none opacity-60"><\/div>\n\s*<div className="absolute inset-0 bg-glow-bottom w-full h-full pointer-events-none opacity-60"><\/div>/,
  ''
);

// Remove text gradient on "Instantly"
content = content.replace(
  /<span className="text-gradient">Instantly<\/span>/,
  '<span className="text-brand-primary">Instantly</span>'
);

// Remove animated background behind input
content = content.replace(
  /<div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-accent rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"><\/div>/,
  ''
);

// Update Input border and shadow for focus-within
content = content.replace(
  /focus-within:border-brand-accent focus-within:shadow-\[0_0_15px_rgba\(37,99,235,0\.25\)\]/g,
  'focus-within:border-brand-primary focus-within:shadow-[0_0_15px_rgba(0,212,255,0.1)]'
);

// Update Fetch button
content = content.replace(
  /bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-hover hover:to-brand-hover text-text-primary px-8 py-4 rounded-xl font-medium transition-all shadow-\[0_0_20px_rgba\(37,99,235,0\.35\)\]/g,
  'bg-brand-primary hover:bg-brand-hover text-[#0B0C0F] px-8 py-4 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(0,212,255,0.15)]'
);

// Update Download button
content = content.replace(
  /bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-hover hover:to-brand-hover text-text-primary px-6 py-4 rounded-xl font-bold transition-all shadow-\[0_0_20px_rgba\(37,99,235,0\.35\)\]/g,
  'bg-brand-primary hover:bg-brand-hover text-[#0B0C0F] px-6 py-4 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(0,212,255,0.15)]'
);

// Remove blue shadow from FAQ hover
content = content.replace(
  /hover:shadow-\[0_4px_30px_rgba\(37,99,235,0\.1\)\]/g,
  'hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
);

// Add text-brand-primary to Features icon container
content = content.replace(
  /className="w-14 h-14 rounded-2xl bg-brand-primary\/10 flex items-center justify-center group-hover:scale-110 transition-transform"/g,
  'className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform"'
);

// Update Logo drop-shadow
content = content.replace(
  /drop-shadow-\[0_0_8px_rgba\(37,99,235,0\.5\)\]/g,
  'drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]'
);

// Remove any remaining brand-accent
content = content.replace(/border-brand-accent/g, 'border-brand-primary');

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Monochrome refactor applied.');
