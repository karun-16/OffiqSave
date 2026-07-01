const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add background noise and spotlight
content = content.replace(
  /<div className="w-full bg-bg-main min-h-screen relative overflow-hidden">/,
  `<div className="w-full bg-bg-main min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-noise pointer-events-none opacity-[0.03] mix-blend-overlay"></div>
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-spotlight pointer-events-none opacity-60 mix-blend-screen"></div>`
);

// 2. Refine Navbar (floating glass effect, subtle blur, rounded corners, thin border)
content = content.replace(
  /className="w-full h-20 flex justify-between items-center fixed top-0 px-4 sm:px-8 md:px-12 z-50 bg-bg-main\/70 backdrop-blur-xl border-b border-border-card"/,
  'className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl h-16 flex justify-between items-center px-6 z-50 bg-bg-card/40 backdrop-blur-md rounded-2xl border border-border-card shadow-lg"'
);

// 3. Hero Heading: Increase size, improve typography hierarchy
content = content.replace(
  /className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 sm:mb-8 leading-tight"/,
  'className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1]"'
);

// 4. Subtitle: Reduce max width, improve spacing
content = content.replace(
  /className="text-base sm:text-lg md:text-xl text-text-secondary mb-12 sm:mb-16 max-w-2xl px-4"/,
  'className="text-lg md:text-xl font-medium text-text-secondary mb-12 sm:mb-16 max-w-xl mx-auto px-4 leading-relaxed"'
);

// 5. Input wrapper: Premium glass appearance, subtle depth, focus animations
content = content.replace(
  /className="relative glass-panel rounded-2xl flex items-center p-2 pl-6 overflow-hidden flex-col sm:flex-row"/,
  'className="relative glass-panel hover:bg-bg-card-hover rounded-2xl flex items-center p-2 pl-6 transition-all duration-500 flex-col sm:flex-row shadow-[0_8px_30px_rgba(0,0,0,0.3)] focus-within:border-brand-primary/50 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.15)]"'
);

// 6. Fetch button: Refined gradient, hover lift, icon
content = content.replace(
  /className="w-full sm:w-auto mt-2 sm:mt-0 bg-brand-primary hover:bg-brand-hover text-\[\#0B0C0F\] px-8 py-4 rounded-xl font-medium transition-all shadow-\[0_0_15px_rgba\(0,212,255,0\.15\)\] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"/,
  'className="w-full sm:w-auto mt-2 sm:mt-0 bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-8 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:shadow-[0_8px_30px_rgba(0,212,255,0.3)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"'
);

// 7. Download button: Refined gradient, hover lift, icon
content = content.replace(
  /className="w-full bg-brand-primary hover:bg-brand-hover text-\[\#0B0C0F\] px-6 py-4 rounded-xl font-bold transition-all shadow-\[0_0_15px_rgba\(0,212,255,0\.15\)\] flex items-center justify-center gap-2 hover:-translate-y-0\.5 active:translate-y-0"/,
  'className="w-full bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-6 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:shadow-[0_8px_30px_rgba(0,212,255,0.3)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"'
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Refined premium CSS applied.');
