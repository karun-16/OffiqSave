const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the ready state rendering block
const readyRegex = /\{\/\* Thumbnail \*\/\}.*?\{\/\* Downloading State \*\/\}/s;

const newReadyBlock = `{/* Thumbnail */}
                <div className="w-full lg:w-5/12 flex flex-col gap-4 shrink-0">
                  <div className="w-full aspect-video bg-black/50 rounded-2xl overflow-hidden relative group border border-white/5">
                    {mediaInfo.thumbnail || (mediaInfo.mediaType === 'gallery' && mediaInfo.images) ? (
                      <img 
                        src={mediaInfo.mediaType === 'gallery' && mediaInfo.images ? mediaInfo.images[currentImageIndex].url : mediaInfo.thumbnail} 
                        alt={mediaInfo.title} 
                        loading="lazy" 
                        decoding="async" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-text-muted" />
                      </div>
                    )}
                    
                    {(mediaInfo.mediaType === 'video' || mediaInfo.mediaType === 'audio' || !mediaInfo.mediaType) && (
                      <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-text-primary/90">
                        {formatDuration(mediaInfo.duration)}
                      </div>
                    )}
                    
                    <div className="absolute top-3 left-3 bg-brand-primary/90 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold text-text-primary uppercase tracking-wider shadow-lg">
                      {mediaInfo.platform}
                    </div>
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

                {/* Info & Actions */}
                <div className="flex-1 flex flex-col w-full h-full justify-between gap-6">
                  <div>
                    {mediaInfo.uploader && (
                      <div className="text-sm text-text-secondary font-medium mb-2 flex items-center gap-2">
                        <span>by</span>
                        {mediaInfo.uploader_url ? (
                          <a href={mediaInfo.uploader_url} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:text-brand-secondary transition-colors underline-offset-4 hover:underline">
                            {mediaInfo.uploader}
                          </a>
                        ) : <span className="text-text-secondary">{mediaInfo.uploader}</span>}
                      </div>
                    )}
                    <h3 className="text-2xl font-bold line-clamp-2 leading-snug text-text-primary/95" title={mediaInfo.title}>
                      {mediaInfo.title}
                    </h3>
                    
                    {(mediaInfo.mediaType === 'video' || mediaInfo.mediaType === 'audio' || !mediaInfo.mediaType) && (
                      <div className="flex items-center gap-4 mt-3 text-sm text-text-muted font-medium">
                        <span>{getEstimatedSize()}</span>
                        <span>&bull;</span>
                        <span className="uppercase">{selectedFormat}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                    
                    {(mediaInfo.mediaType === 'video' || mediaInfo.mediaType === 'audio' || !mediaInfo.mediaType) ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Format Selector */}
                          <div className="flex flex-col gap-2">
                            <label className="text-xs text-text-secondary uppercase font-bold tracking-wider">Format</label>
                            <div className="relative group">
                              <select 
                                className="w-full appearance-none bg-bg-input border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-brand-primary/50 transition-colors cursor-pointer text-sm font-medium"
                                value={selectedFormat}
                                onChange={(e) => {
                                  setSelectedFormat(e.target.value);
                                  if (e.target.value === "audio") {
                                    setSelectedAudioExt("mp3");
                                  }
                                }}
                              >
                                <option value="video" className="bg-bg-input">Video</option>
                                <option value="audio" className="bg-bg-input">Audio</option>
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none group-hover:text-text-primary transition-colors" />
                            </div>
                          </div>

                          {/* Quality Selector */}
                          <div className="flex flex-col gap-2">
                            <label className="text-xs text-text-secondary uppercase font-bold tracking-wider">Quality</label>
                            <div className="relative group">
                              {selectedFormat === "audio" ? (
                                <select 
                                  className="w-full appearance-none bg-bg-input border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-brand-primary/50 transition-colors cursor-pointer text-sm font-medium"
                                  value={selectedAudioExt}
                                  onChange={(e) => setSelectedAudioExt(e.target.value)}
                                >
                                  <option value="mp3" className="bg-bg-input">Best Audio • MP3 • 320 kbps</option>
                                  <option value="m4a" className="bg-bg-input">High • M4A • 256 kbps</option>
                                  <option value="mp3_192" className="bg-bg-input">Medium • MP3 • 192 kbps</option>
                                  <option value="mp3_128" className="bg-bg-input">Low • MP3 • 128 kbps</option>
                                </select>
                              ) : (
                                <select 
                                  className="w-full appearance-none bg-bg-input border border-white/10 hover:border-white/20 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-brand-primary/50 transition-colors cursor-pointer text-sm font-medium"
                                  value={selectedQuality}
                                  onChange={(e) => setSelectedQuality(e.target.value)}
                                >
                                  {mediaInfo.formats
                                    .filter(f => f.resolution && f.resolution !== 'audio only' && f.vcodec !== 'none')
                                    .reverse()
                                    .map(f => {
                                      let sizeStr = "";
                                      if (f.filesize) sizeStr = formatBytes(f.filesize);
                                      else if ((f as any).filesize_approx) sizeStr = \`~\${formatBytes((f as any).filesize_approx)}\`;
                                      
                                      return (
                                        <option key={f.format_id} value={f.format_id} className="bg-bg-input">
                                          {f.resolution === 'audio only' ? 'Audio' : f.resolution} • {f.ext.toUpperCase()}{sizeStr ? \` • \${sizeStr}\` : ''}
                                        </option>
                                      );
                                    })}
                                </select>
                              )}
                              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none group-hover:text-text-primary transition-colors" />
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={handleDownload}
                          className="w-full bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-6 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:shadow-[0_8px_30px_rgba(0,212,255,0.3)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Download Now
                        </button>
                      </>
                    ) : mediaInfo.mediaType === 'image' ? (
                      <>
                        <div className="flex items-center justify-between px-4 py-3 bg-bg-input rounded-xl border border-white/5">
                          <span className="text-sm font-medium text-text-secondary">Format</span>
                          <span className="text-sm font-bold text-text-primary uppercase">{mediaInfo.images?.[0]?.format || 'JPG'}</span>
                        </div>
                        <button 
                          onClick={() => handleImageDownload(mediaInfo.images![0].url, mediaInfo.images![0].id + '.' + mediaInfo.images![0].format)}
                          className="w-full bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-6 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:shadow-[0_8px_30px_rgba(0,212,255,0.3)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" /> Download Original Image
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-4 py-3 bg-bg-input rounded-xl border border-white/5 mb-2">
                          <span className="text-sm font-medium text-text-secondary">Gallery Overview</span>
                          <span className="text-sm font-bold text-text-primary">{mediaInfo.images?.length || 0} Images</span>
                        </div>
                        <div className="text-center mb-2">
                          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Image {currentImageIndex + 1} of {mediaInfo.images?.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleImageDownload(mediaInfo.images![currentImageIndex].url, mediaInfo.images![currentImageIndex].id + '.' + mediaInfo.images![currentImageIndex].format)}
                            className="w-full bg-bg-input hover:bg-bg-card-hover border border-white/5 hover:border-white/10 text-text-primary px-4 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            <Download className="w-4 h-4" /> Current Image
                          </button>
                          <button 
                            onClick={handleZipDownload}
                            className="w-full bg-gradient-to-b from-[#37E0FF] to-[#00D4FF] hover:from-[#5DE8FF] hover:to-[#00BCE6] text-[#0B0C0F] px-4 py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(0,212,255,0.2)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 text-sm"
                          >
                            <Download className="w-4 h-4" /> Download All (.zip)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Downloading State */}`;

if (!content.match(readyRegex)) {
  console.log('REGEX DID NOT MATCH');
} else {
  content = content.replace(readyRegex, newReadyBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated UI');
}
