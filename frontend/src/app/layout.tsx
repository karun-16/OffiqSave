import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OffiqSave - Premium Media Downloader',
  description: 'Instantly download and convert media from various platforms.',
  openGraph: {
    title: 'OffiqSave',
    description: 'Instantly download and convert media from various platforms.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} bg-[#07090D] text-white antialiased min-h-screen flex flex-col`}>
        {/* Background ambient glow */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#2563EB]/10 blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#06B6D4]/10 blur-[120px] animate-pulse-slow"></div>
        </div>
        
        <main className="flex-1 flex flex-col w-full">
          {children}
        </main>
        
        {/* Premium Global Footer */}
        <footer className="w-full border-t border-white/10 bg-[#07090D]/50 backdrop-blur-xl mt-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent"></div>
          <div className="max-w-5xl mx-auto px-8 py-12 flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="OffiqSave Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
                <span className="font-bold text-xl tracking-tight text-white">OffiqSave</span>
              </div>
              <span className="text-sm text-gray-400">Developed by <span className="text-brand-primary font-medium">EnclaveEdge</span></span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="https://enclaveedge.netlify.app/" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10">
                <img src="/enclaveedge-logo.png" alt="EnclaveEdge" className="h-8 object-contain" />
              </a>
              <a href="https://www.linkedin.com/company/enclaveedgetechnologies/" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 hover:text-[#0A66C2] transition-all p-2 rounded-xl hover:bg-[#0A66C2]/10 border border-transparent hover:border-[#0A66C2]/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
            
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-2"></div>
            
            <div className="text-sm text-gray-500 font-medium text-center">
              &copy; {new Date().getFullYear()} OffiqSave. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
