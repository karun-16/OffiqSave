const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Colors
content = content.replace(/text-white/g, 'text-text-primary');
content = content.replace(/text-gray-400/g, 'text-text-secondary');
content = content.replace(/text-gray-500/g, 'text-text-muted');
content = content.replace(/text-gray-300/g, 'text-text-secondary');
content = content.replace(/text-gray-600/g, 'text-text-muted');
content = content.replace(/bg-\[\#07090D\]/gi, 'bg-bg-main');
content = content.replace(/bg-\[\#0a0d14\]/gi, 'bg-bg-input');
content = content.replace(/hover:bg-brand-secondary/g, 'hover:bg-brand-hover');

// Header Area
content = content.replace(
  '<div className="w-full">',
  '<div className="w-full bg-bg-main min-h-screen relative overflow-hidden">\n      <div className="absolute inset-0 bg-glow-top w-full h-full pointer-events-none opacity-60"></div>\n      <div className="absolute inset-0 bg-glow-bottom w-full h-full pointer-events-none opacity-60"></div>'
);

content = content.replace(
  'className="w-full h-20 flex justify-between items-center fixed top-0 px-4 sm:px-8 md:px-12 z-50 bg-[#07090D]/90 backdrop-blur-xl border-b border-text-primary/10"',
  'className="w-full h-20 flex justify-between items-center fixed top-0 px-4 sm:px-8 md:px-12 z-50 bg-bg-card/30 backdrop-blur-xl border-b border-text-primary/5"'
);

// Input Form
content = content.replace(
  /<\!-- Input Box -->[\s\S]*?<\/form>/,
  `{/* Input Box */}
          <form onSubmit={handlePasteAndFetch} className="w-full relative group">
            <div className="relative bg-bg-input border border-border-input focus-within:border-brand-accent focus-within:shadow-[0_0_15px_rgba(37,99,235,0.25)] rounded-2xl flex items-center p-2 pl-6 overflow-hidden flex-col sm:flex-row transition-all duration-300">
              <Link2 className="w-6 h-6 text-text-secondary shrink-0 hidden sm:block" />
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste your media URL here..." 
                className="flex-1 w-full bg-transparent border-none outline-none text-text-primary px-4 py-4 text-base sm:text-lg placeholder:text-text-muted"
                disabled={status === "loading" || status === "downloading"}
              />
              <button 
                type="submit"
                disabled={!url.trim() || status === "loading" || status === "downloading"}
                className="w-full sm:w-auto mt-2 sm:mt-0 bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-hover hover:to-brand-hover text-text-primary px-8 py-4 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
              >
                {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fetch"}
              </button>
            </div>
          </form>`
);

// Download button inside Info & Actions
content = content.replace(
  /className="w-full bg-brand-primary hover:bg-brand-hover text-text-primary px-6 py-4 rounded-xl font-bold transition-all shadow-\[0_0_20px_rgba\(37,99,235,0\.3\)\] hover:shadow-\[0_0_30px_rgba\(37,99,235,0\.5\)\] flex items-center justify-center gap-2 hover:-translate-y-0\.5 active:translate-y-0"/,
  'className="w-full bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-hover hover:to-brand-hover text-text-primary px-6 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.35)] flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"'
);

// Replace text-text-primary/10 border references with border-white/5
content = content.replace(/border-text-primary\/10/g, 'border-white/5');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactor script completed.');
