"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Download, CheckCircle, Loader2, PlayCircle, ChevronDown, AlertCircle, Zap, FileVideo, Globe, Shield, RefreshCw } from "lucide-react";
import axios from "axios";

// Types
interface MediaFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
  abr?: number;
}

interface MediaInfo {
  title: string;
  thumbnail: string;
  duration: number;
  platform: string;
  uploader?: string;
  uploader_url?: string;
  formats: MediaFormat[];
  mediaType?: 'video' | 'audio' | 'image' | 'gallery';
  images?: Array<{ id: string; url: string; width?: number; height?: number; format: string }>;
}

const DOWNLOAD_STAGES = [
  "Preparing...",
  "Fetching Metadata...",
  "Preparing Download...",
  "Downloading...",
  "Merging...",
  "Converting...",
  "Finalizing...",
  "Completed."
];

const FEATURES = [
  { icon: <Zap className="w-6 h-6 text-brand-primary" />, title: "Fast Downloads", description: "Optimized connection streams directly from media servers to you." },
  { icon: <FileVideo className="w-6 h-6 text-brand-primary" />, title: "Multiple Formats", description: "Convert video to MP4, WebM, or extract high-quality MP3 audio." },
  { icon: <RefreshCw className="w-6 h-6 text-brand-primary" />, title: "Multiple Qualities", description: "Download in 4K, 1080p, 720p or lower resolutions tailored to your needs." },
  { icon: <Globe className="w-6 h-6 text-brand-primary" />, title: "Cross Platform", description: "Works with Instagram, TikTok, Facebook, YouTube, X, and thousands more." },
  { icon: <Download className="w-6 h-6 text-brand-primary" />, title: "Simple Interface", description: "No ads, no popups. Just paste the URL and click download." },
  { icon: <Shield className="w-6 h-6 text-brand-primary" />, title: "Secure Processing", description: "Files are processed securely and immediately deleted from our servers." }
];

const FAQS = [
  { q: "Which websites are supported?", a: "OffiqSave supports thousands of platforms including YouTube, Instagram, TikTok, X (Twitter), Facebook, Reddit, and many generic media links. If a platform is not supported, our system will automatically notify you during the fetching phase." },
  { q: "Why is my download unavailable?", a: "Downloads may fail if the video is set to private, requires a login to view, or is geoblocked. Ensure the URL points to a publicly accessible media file." },
  { q: "How long are files stored?", a: "We do not store your files. Media is streamed directly to you and any temporary cache is instantly deleted from our servers the moment the transfer completes." },
  { q: "What formats are supported?", a: "Currently we support video downloads primarily in MP4 and WebM formats depending on the source platform's availability. For audio conversions, we process and deliver high-quality MP3 files." }
];

const formatDuration = (seconds: number) => {
  if (!seconds) return "Unknown";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "downloading" | "done">("idle");
  const [downloadStageIdx, setDownloadStageIdx] = useState(0);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Selection
  const [selectedFormat, setSelectedFormat] = useState("video");
  const [selectedAudioExt, setSelectedAudioExt] = useState("mp3");
  const [selectedQuality, setSelectedQuality] = useState("");



  const handlePasteAndFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setStatus("loading");
    setErrorMsg("");
    setMediaInfo(null);
    setDownloadStageIdx(0);

    try {
      const res = await axios.post("http://localhost:4000/api/info", { url });
      setMediaInfo(res.data);
      
      // Auto-select best quality if available
      if (res.data.formats && res.data.formats.length > 0) {
        const videoFormats = res.data.formats.filter((f: any) => f.vcodec !== 'none' && f.resolution);
        if (videoFormats.length > 0) {
           setSelectedQuality(videoFormats[videoFormats.length - 1].format_id);
        } else {
           setSelectedQuality(res.data.formats[0].format_id);
        }
      }
      
      setStatus("ready");
    } catch (err: any) {
      if (!err.response) {
        setErrorMsg("Network Error: Could not connect to the backend server.");
      } else {
        setErrorMsg(err.response?.data?.error || "Failed to fetch media. Please check the URL.");
      }
      setStatus("idle");
    }
  };

  const handleZipDownload = async () => {
    if (!mediaInfo?.images) return;
    setStatus("downloading");
    setDownloadStageIdx(3); // Start progress
    
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
    setDownloadStageIdx(3);
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

  const handleDownload = async () => {
    if (!mediaInfo || !selectedQuality) return;

    setStatus("downloading");
    setDownloadStageIdx(0);

    // Simulate progress stages visually while the request runs
    const stageInterval = setInterval(() => {
      setDownloadStageIdx(prev => {
        if (prev < DOWNLOAD_STAGES.length - 2) return prev + 1;
        return prev;
      });
    }, 3000);

    try {
      let endpoint = "http://localhost:4000/api/download";
      let payload: any = { url, formatId: selectedQuality };

      if (selectedFormat === "audio") {
        endpoint = "http://localhost:4000/api/convert";
        payload.formatId = 'bestaudio/best';
        payload.targetFormat = selectedAudioExt.replace(/_.*/, '');
      }

      const response = await axios.post(endpoint, payload, {
        responseType: 'blob'
      });

      clearInterval(stageInterval);
      setDownloadStageIdx(DOWNLOAD_STAGES.length - 1); // Completed
      
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      const ext = selectedFormat === "audio" ? selectedAudioExt.replace(/_.*/, '') : "mp4";
      link.setAttribute('download', `${mediaInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setTimeout(() => setStatus("done"), 1000);
      setTimeout(() => {
        setStatus("idle");
        setUrl("");
        setMediaInfo(null);
      }, 6000);
    } catch (err: any) {
      clearInterval(stageInterval);
      setErrorMsg(err.response?.data?.error || "Download failed. Please try again.");
      setStatus("idle");
    }
  };

  const getEstimatedSize = useCallback(() => {
    if (!mediaInfo) return "";
    const format = mediaInfo.formats.find(f => f.format_id === selectedQuality);
    if (!format) return "";
    let sizeStr = "";
    if (format.filesize) sizeStr = formatBytes(format.filesize);
    else if ((format as any).filesize_approx) sizeStr = `~${formatBytes((format as any).filesize_approx)}`;
    return sizeStr || "Unknown Size";
  }, [mediaInfo, selectedQuality]);

  return (
    <div className="w-full bg-bg-main min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-noise pointer-events-none opacity-[0.03] mix-blend-overlay"></div>
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-spotlight pointer-events-none opacity-60 mix-blend-screen"></div>
      
      {/* Header Area */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl h-16 flex justify-between items-center px-6 z-50 bg-bg-card/40 backdrop-blur-md rounded-2xl border border-border-card shadow-lg"
      >
        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo.png" alt="OffiqSave Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]" />
          <span className="font-bold text-xl md:text-2xl tracking-tight text-text-primary hidden sm:block">OffiqSave</span>
        </div>
        <nav className="flex gap-6 text-sm md:text-base text-text-secondary font-medium">
          <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
          <a href="#faq" className="hover:text-text-primary transition-colors">FAQ</a>
        </nav>
      </motion.div>

      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-8 pt-36 sm:pt-48 md:pt-56 pb-16 w-full max-w-5xl mx-auto min-h-screen">
        
        {/* Main Hero */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="w-full max-w-3xl flex flex-col items-center text-center mt-4 sm:mt-8"
        >
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1]">
            Download & Convert <br className="hidden md:block" />
            Media <span className="text-brand-primary">Instantly</span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-text-secondary mb-12 sm:mb-16 max-w-2xl mx-auto px-4 leading-relaxed">
            One link. Instant downloads for videos, audio, and photos.
          </p>

          {/* Input Box */}
          <form onSubmit={handlePasteAndFetch} className="w-full relative group">
            
            <div className="relative glass-panel hover:bg-bg-card-hover rounded-2xl flex items-center p-2 pl-6 transition-all duration-500 flex-col sm:flex-row shadow-[0_8px_30px_rgba(0,0,0,0.3)] focus-within:border-brand-primary/50 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.15)]">
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
                className="w-full sm:w-auto mt-2 sm:mt-0 bg-brand-primary hover:bg-brand-hover text-text-primary px-8 py-4 rounded-xl font-medium transition-all shadow-lg shadow-brand-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
              >
                {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fetch"}
              </button>
            </div>
          </form>
        </motion.div>

        {/* State Transitions */}
        <div className="w-full max-w-4xl mt-16 sm:mt-24 min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {/* Error State */}
            {errorMsg && status === "idle" && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel border-red-500/30 bg-red-500/5 rounded-2xl p-6 flex items-center gap-4 text-red-400"
              >
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="font-medium text-sm md:text-base leading-relaxed">{errorMsg}</p>
              </motion.div>
            )}

            {/* Skeleton Loading State */}
            {status === "loading" && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel rounded-3xl p-6 flex flex-col md:flex-row gap-8 w-full items-start overflow-hidden border border-white/5"
              >
                {/* Thumbnail Skeleton */}
                <div className="w-full md:w-[280px] shrink-0">
                  <div className="w-full aspect-video rounded-2xl bg-white/5 animate-pulse overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                  </div>
                </div>

                {/* Info & Actions Skeleton */}
                <div className="flex-1 flex flex-col w-full gap-6 mt-2 md:mt-0">
                  <div className="space-y-4">
                    <div className="h-4 w-24 bg-white/5 rounded-full animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-6 w-full bg-white/5 rounded-full animate-pulse" />
                      <div className="h-6 w-3/4 bg-white/5 rounded-full animate-pulse" />
                    </div>
                    <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse mt-4" />
                  </div>

                  <div className="space-y-5 bg-white/[0.02] p-5 rounded-2xl border border-white/5 mt-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-3 w-16 bg-white/5 rounded-full animate-pulse" />
                        <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-16 bg-white/5 rounded-full animate-pulse" />
                        <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
                      </div>
                    </div>
                    <div className="h-14 w-full bg-white/5 rounded-xl animate-pulse" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Ready State */}
            {status === "ready" && mediaInfo && (
              <motion.div 
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start w-full shadow-2xl shadow-brand-primary/5"
              >
                {/* Thumbnail */}
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
                          className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-brand-primary opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        >
                          <img src={img.url} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
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
                                      else if ((f as any).filesize_approx) sizeStr = `~${formatBytes((f as any).filesize_approx)}`;
                                      
                                      return (
                                        <option key={f.format_id} value={f.format_id} className="bg-bg-input">
                                          {f.resolution === 'audio only' ? 'Audio' : f.resolution} • {f.ext.toUpperCase()}{sizeStr ? ` • ${sizeStr}` : ''}
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

            {/* Downloading State */}
            {status === "downloading" && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel rounded-3xl p-10 flex flex-col items-center justify-center gap-8 w-full shadow-2xl shadow-brand-primary/10"
              >
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="animate-spin absolute w-full h-full text-brand-primary/20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-100" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-100 text-brand-primary" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <Download className="w-8 h-8 absolute text-brand-primary animate-pulse" />
                </div>
                
                <div className="text-center w-full max-w-md">
                  <h3 className="text-2xl font-bold mb-6 text-text-primary tracking-tight">
                    {DOWNLOAD_STAGES[downloadStageIdx]}
                  </h3>
                  
                  {/* Progress Bar Container */}
                  <div className="w-full bg-white/5 rounded-full h-3 mb-4 overflow-hidden relative border border-white/10">
                    <motion.div 
                      className="bg-gradient-to-r from-brand-primary to-brand-accent h-full rounded-full relative overflow-hidden"
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min(((downloadStageIdx + 1) / DOWNLOAD_STAGES.length) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:1rem_1rem] animate-[shimmer_1s_infinite_linear]"></div>
                    </motion.div>
                  </div>

                  <p className="text-text-secondary text-sm font-medium">Please do not close or refresh this page.</p>
                </div>
              </motion.div>
            )}

            {/* Done State */}
            {status === "done" && (
              <motion.div 
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel border-green-500/30 rounded-3xl p-12 flex flex-col items-center justify-center gap-6 text-green-400 shadow-2xl shadow-green-500/10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <CheckCircle className="w-20 h-20" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-text-primary mb-2">Download Complete</h3>
                  <p className="text-text-secondary text-base">Your file has been saved to your device.</p>
                </div>
                <button 
                  onClick={() => { setStatus("idle"); setUrl(""); }}
                  className="mt-6 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-text-primary font-medium transition-all hover:scale-105 active:scale-95 border border-white/10"
                >
                  Download Another Media
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* Features Section */}
      <section id="features" className="w-full py-24 border-t border-border-card relative bg-bg-main/50 scroll-mt-28">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Premium <span className="text-gradient">Features</span></h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Everything you need to save and convert media from around the web, built with production-grade engineering.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-8 rounded-2xl flex flex-col gap-4 hover:border-brand-primary/30 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-text-primary/95">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed text-sm">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="w-full py-24 border-t border-border-card relative scroll-mt-28">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked <span className="text-gradient">Questions</span></h2>
          </motion.div>

          <div className="w-full flex flex-col gap-4">
            {FAQS.map((faq, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 sm:p-8 rounded-2xl transition-colors hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              >
                <h3 className="text-lg font-bold mb-3 text-text-primary/95">{faq.q}</h3>
                <p className="text-text-secondary leading-relaxed text-sm">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
    </div>
  );
}
