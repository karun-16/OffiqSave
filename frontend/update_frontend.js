const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update MediaInfo interface
content = content.replace(
  /interface MediaInfo {[\s\S]*?formats: MediaFormat\[\];\n}/,
  `interface MediaInfo {
  title: string;
  thumbnail: string;
  duration: number;
  platform: string;
  uploader?: string;
  uploader_url?: string;
  formats: MediaFormat[];
  mediaType?: 'video' | 'audio' | 'image' | 'gallery';
  images?: Array<{ id: string; url: string; width?: number; height?: number; format: string }>;
}`
);

// 2. Add Gallery state variables
content = content.replace(
  /const \[mediaInfo, setMediaInfo\] = useState<MediaInfo \| null>\(null\);/,
  `const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);`
);

// 3. Add handleZipDownload
content = content.replace(
  /const handleDownload = async \(\) => {/,
  `const handleZipDownload = async () => {
    if (!mediaInfo?.images) return;
    setStatus("downloading");
    setDownloadProgress(3); // Start progress
    
    try {
      const response = await fetch("http://localhost:5000/api/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: mediaInfo.images })
      });
      
      if (!response.ok) throw new Error("ZIP generation failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "gallery.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setStatus("ready");
    } catch (e: any) {
      console.error(e);
      setStatus("idle");
      setErrorMsg(e.message || "ZIP Download failed");
    }
  };

  const handleImageDownload = async (imgUrl: string, filename: string) => {
    setStatus("downloading");
    setDownloadProgress(3);
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus("ready");
    } catch (e: any) {
      console.error(e);
      setStatus("idle");
      setErrorMsg("Failed to download image");
    }
  };

  const handleDownload = async () => {`
);

// 4. Update the render logic in Ready State
// The original ready state is a motion.div key="ready"
// Let's replace the content inside the "ready" block. We'll find the start of the grid.
const readyStateRegex = /(<div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">)[\s\S]*?(<\/div>\s*<\/motion\.div>)/;

const newReadyContent = `$1
                {/* Thumbnail Column */}
                <div className="md:col-span-5 w-full flex flex-col items-center gap-4">
                  <div className="w-full aspect-video md:aspect-[4/5] bg-black/50 rounded-xl overflow-hidden relative border border-white/5 shadow-inner">
                    <img 
                      src={mediaInfo.mediaType === 'gallery' && mediaInfo.images ? mediaInfo.images[currentImageIndex].url : mediaInfo.thumbnail} 
                      alt="Thumbnail" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 bg-[#0B0C0F]/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10 shadow-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                      {mediaInfo.platform.charAt(0).toUpperCase() + mediaInfo.platform.slice(1)}
                    </div>
                    {(mediaInfo.mediaType === 'video' || mediaInfo.mediaType === 'audio') && (
                      <div className="absolute bottom-3 right-3 bg-[#0B0C0F]/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10 shadow-lg flex items-center gap-2">
                        {formatDuration(mediaInfo.duration)}
                      </div>
                    )}
                  </div>
                  
                  {mediaInfo.mediaType === 'gallery' && mediaInfo.images && (
                    <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-brand-primary/50 scrollbar-track-transparent">
                      {mediaInfo.images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={\`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all \${idx === currentImageIndex ? 'border-brand-primary opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}\`}
                        >
                          <img src={img.url} className="w-full h-full object-cover" alt={\`Thumb \${idx}\`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info Column */}
                <div className="md:col-span-7 flex flex-col justify-between">
                  <div className="flex flex-col gap-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight line-clamp-2">
                      {mediaInfo.title}
                    </h2>
                    
                    {mediaInfo.uploader && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
                          {mediaInfo.uploader.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{mediaInfo.uploader}</span>
                      </div>
                    )}
                    
                    <div className="w-full h-[1px] bg-white/5 my-2"></div>
                    
                    {/* Dynamic Action Area based on MediaType */}
                    {(mediaInfo.mediaType === 'video' || mediaInfo.mediaType === 'audio' || !mediaInfo.mediaType) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Format</label>
                          <div className="relative">
                            <select 
                              className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-white appearance-none focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 transition-all shadow-inner"
                              value={selectedFormat}
                              onChange={(e) => setSelectedFormat(e.target.value)}
                            >
                              <option value="mp4">Video (MP4)</option>
                              <option value="mp3">Audio (MP3)</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quality</label>
                          <div className="relative">
                            <select 
                              className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-white appearance-none focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 transition-all shadow-inner"
                              value={selectedQuality}
                              onChange={(e) => setSelectedQuality(e.target.value)}
                            >
                              {mediaInfo.formats
                                .filter(f => selectedFormat === 'mp3' ? f.acodec !== 'none' : f.vcodec !== 'none')
                                .map((f) => (
                                  <option key={f.format_id} value={f.format_id}>
                                    {selectedFormat === 'mp3' 
                                      ? \`Audio \${f.abr ? Math.round(f.abr) + 'kbps' : 'Best'}\`
                                      : \`\${f.resolution || 'Auto'} (\${f.ext})\`
                                    }
                                  </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-between px-2 py-1 mt-1 bg-white/5 rounded-lg border border-white/5">
                          <span className="text-xs font-medium text-gray-400">Estimated Size</span>
                          <span className="text-sm font-bold text-brand-primary">{getEstimatedSize()}</span>
                        </div>
                        <div className="sm:col-span-2 mt-4">
                          <button 
                            onClick={handleDownload}
                            className="w-full bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-6 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:shadow-[0_8px_30px_rgba(0,212,255,0.3)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                          >
                            <Download className="w-5 h-5" /> Download Media
                          </button>
                        </div>
                      </div>
                    ) : mediaInfo.mediaType === 'image' ? (
                      <div className="flex flex-col gap-4 mt-4">
                        <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-sm font-medium text-gray-400">Format</span>
                          <span className="text-sm font-bold text-white uppercase">{mediaInfo.images?.[0]?.format || 'JPG'}</span>
                        </div>
                        <button 
                          onClick={() => handleImageDownload(mediaInfo.images![0].url, mediaInfo.images![0].id + '.' + mediaInfo.images![0].format)}
                          className="w-full bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-6 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:shadow-[0_8px_30px_rgba(0,212,255,0.3)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" /> Download Original Image
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 mt-4">
                        <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-sm font-medium text-gray-400">Gallery Details</span>
                          <span className="text-sm font-bold text-white">{mediaInfo.images?.length || 0} Images</span>
                        </div>
                        <span className="text-xs text-center text-gray-400">Image {currentImageIndex + 1} of {mediaInfo.images?.length}</span>
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleImageDownload(mediaInfo.images![currentImageIndex].url, mediaInfo.images![currentImageIndex].id + '.' + mediaInfo.images![currentImageIndex].format)}
                            className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            <Download className="w-4 h-4" /> Current Image
                          </button>
                          <button 
                            onClick={handleZipDownload}
                            className="w-full bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-4 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:-translate-y-1 flex items-center justify-center gap-2 text-sm"
                          >
                            <Download className="w-4 h-4" /> Download All (.zip)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
$2`;

content = content.replace(readyStateRegex, newReadyContent);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Frontend page.tsx updated.');
