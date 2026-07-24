# OffiqSave

OffiqSave is a premium, high-performance universal media downloader and converter web application supporting **Instagram**, **X/Twitter**, **YouTube**, **Facebook**, **Pinterest**, and **Reddit**.

---

## 🚀 Recent Features & Accomplishments

### 🐦 X/Twitter Multi-Video & Native Media Engine
- **Multi-Video Tweet Extraction**:
  - Full support for multi-video tweets alongside single images, multiple images, video quality selection, and audio extraction.
  - Extended shared `MediaInfo` contract with `videos: VideoMedia[]` array to keep quality variants of separate videos independent.
  - Interactive frontend UI rendering responsive multi-video grid layouts with HTML5 video previews, quality pickers, and individual video download triggers.
- **Strict Hostname Classification**:
  - Replaced loose substring checks with strict URL hostname parsing in `TwitterExtractor.supports()`, preventing false-positive matches on unrelated URLs.

### 🎥 YouTube Audio Quality & Download Performance Optimization
- **Multi-Signal Audio Ranking**:
  - Implemented high-bitrate audio selection prioritizing `abr` > `bitrate` > `tbr` > codec preference.
  - Selects real audio-only formats (e.g. format `140` M4A AAC 128k, format `251` WebM Opus 160k).
- **YouTube-Scoped Media Transfer**:
  - Leverages `yt-dlp` optimized media transfer for YouTube downloads, automatically merging video-only formats (`<formatId>+bestaudio/best`) via FFmpeg.
  - Instant metadata caching reducing cache-hit overhead to `< 1ms`.

### ⚡ Token-Based Native Browser Download Architecture
- **Zero JavaScript Heap Buffering**:
  - Replaced frontend Axios `responseType: "blob"` and `URL.createObjectURL(blob)` memory buffering with native browser download manager delivery.
- **Two-Step Secure Stream Pipeline**:
  1. `POST /api/download/prepare` validates options and returns a short-lived, single-use UUID `downloadId` in `~4ms`.
  2. `GET /api/download/file/:downloadId` streams binary attachments natively with `Content-Disposition: attachment; filename="..."`.
- **Automatic Resource Cleanup**:
  - Temporary files cleaned up safely on `res.on("finish")` and `res.on("close")`.

### 🤖 Reddit Multi-Media Engine
- **Native Image & Gallery Extraction**:
  - Extracts single image posts and multi-item gallery posts natively in original post order (`gallery_data.items` + `media_metadata`).
  - Automatically unescapes HTML entity encodings (`&amp;` -> `&`) across all image, gallery, preview, and thumbnail URLs.
  - Sends explicit custom Reddit API headers (`User-Agent: desktop:OffiqSave:v1.0.0`) for `.json` metadata endpoints.
- **Video + Audio DASH Stream Merging**:
  - Detects native Reddit video posts (`v.redd.it`) and routes video downloads to `yt-dlp` + FFmpeg to merge separate DASH video and DASH audio tracks into complete MP4 files.

---

## 🛠️ Prerequisites
- **Node.js**: v18 or higher
- **FFmpeg**: Installed and available in your system `PATH`.
- **yt-dlp**: Managed via `yt-dlp-exec`.

---

## 📁 Project Structure
```
OffiqSave/
├── frontend/             # Next.js 16 App Router, React 19, Tailwind CSS, Framer Motion
│   └── src/app/page.tsx  # Universal media downloader UI, multi-video cards, native download triggers
├── backend/              # Node.js Express Server, fluent-ffmpeg, Native Extractors
│   ├── src/
│   │   ├── controllers/  # mediaController (info, prepareDownload, downloadFile, convert)
│   │   ├── extractors/   # Platform-specific extractors (Instagram, Twitter, Reddit, YouTube, Facebook, Pinterest)
│   │   ├── services/     # DownloaderService, ExtractionRouter, MediaClassifier
│   │   └── router/       # PlatformRouter & ExtractorRegistry
```

---

## ⚡ Quick Start

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
The backend server runs on `http://localhost:4000`.

### 2. Start the Frontend Application
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend application runs on `http://localhost:3000`.

Open your browser and navigate to `http://localhost:3000`.

---

## 🧪 Verification & Testing

### Backend Typecheck & Build
```bash
cd backend
npx tsc --noEmit
```

### Frontend Production Build
```bash
cd frontend
npm run build
```
