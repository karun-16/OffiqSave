# OffiqSave

OffiqSave is a premium, high-performance universal media downloader and converter web application.

---

## 🚀 Recent Updates & Features

### ⚡ Native Instagram Extraction Engine
- **Standalone Instagram Reel Extractor (`InstagramReelExtractor`)**:
  - Native parsing for Instagram Reels and TV URLs (`/reel/`, `/reels/`, `/tv/`).
  - Fetches public page HTML and parses `ScheduledServerJS` & `__bbox` JSON structures.
  - Implements recursive object traversal to locate high-resolution MP4 video candidates.
  - Completely bypasses `yt-dlp` for Reel extraction and streams direct CDN MP4 URLs via HTTP GET.
- **Refactored Instagram Post Extractor (`InstagramExtractor`)**:
  - Replaced legacy fixed-path parser with a recursive JSON walker over `ScheduledServerJS` & `__bbox` data structures.
  - Implements `extractPolarisMedia` supporting:
    - **Single Images**: High-resolution `image_versions2.candidates[0]` extraction.
    - **Carousels**: Full multi-item `carousel_media[]` parsing.
    - **Videos**: Direct `video_versions` extraction.
- **Smart Extraction Router (`ExtractionRouter`)**:
  - Classifies incoming Instagram URLs by path type (`reel`, `tv`, `post`).
  - Routes Reel/TV requests directly to `InstagramReelExtractor` and Post requests to `InstagramExtractor`.
  - Detailed pipeline logging: `[Router] URL`, `[Router] Path Type`, `[Router] Selected Extractor`.
- **Direct CDN Streaming Download Pipeline**:
  - Download endpoint (`/api/download`) streams native CDN video and image URLs directly via Node.js web streams with `Content-Disposition: attachment`.
  - Zero unnecessary `yt-dlp` invocations for native Instagram extractions.

### 🎨 Frontend & UI Improvements
- **Fixed-Width Download Card Layout**:
  - Card container bounded at `max-w-4xl` with `items-stretch`.
  - Preview thumbnail column locked to fixed `300px` width (`w-[300px] min-w-[300px] max-w-[300px] shrink-0`), preventing long captions from resizing the preview image.
  - Right content flex container uses `min-w-0 overflow-hidden` with `line-clamp-2` on post captions to ensure long hashtags wrap without distorting card dimensions.
  - Controls panel pinned to the bottom of the card (`mt-auto`).
- **Clean Quality Selector**:
  - Automatically formats native single MP4 options as `"Best Quality"`.

---

## Prerequisites
- **Node.js**: v18 or higher
- **FFmpeg**: Installed and available in your system `PATH`.
- **yt-dlp**: Installed or managed via `yt-dlp-exec`.

---

## Project Structure
```
OffiqSave/
├── frontend/             # Next.js 15 App Router, React 19, Tailwind CSS v4, Framer Motion
├── backend/              # Node.js Express Server, fluent-ffmpeg, Native Extractors
│   ├── src/
│   │   ├── controllers/  # mediaController (info, download, convert)
│   │   ├── extractors/   # InstagramReelExtractor
│   │   ├── services/     # ExtractionRouter, MediaClassifier, DownloaderService
│   │   │   ├── extractors/  # InstagramExtractor, NativeReelExtractor
│   │   │   └── handlers/    # PlatformHandlers, BaseHandler
```

---

## Quick Start

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```
The backend server runs on `http://localhost:4000`.

### 2. Start the Frontend
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend application runs on `http://localhost:3000`.

Open your browser and navigate to `http://localhost:3000`.

---

## Architecture Overview

1. **Routing & Classification**:
   - `MediaClassifier` detects the target platform and expected media type from the URL.
   - `ExtractionRouter` checks path types and invokes dedicated native extractors before falling back to `yt-dlp`.

2. **Native Scraping & Extraction**:
   - `InstagramReelExtractor` & `InstagramExtractor` fetch page HTML with modern Chrome headers.
   - Script blocks containing `ScheduledServerJS` and `__bbox` JSON are parsed using recursive AST-style object walkers.
   - Resolves direct CDN media URLs (`.mp4`, `.jpg`).

3. **Direct Streaming Download**:
   - Native media downloads are streamed directly from CDN sources to the client browser via Express response piping with clean filenames (`Content-Disposition: attachment`).

---

## Authentication (`cookies.txt`)

For private posts, stories, or rate-limited platforms, OffiqSave supports passing session cookies:

1. Export cookies from your browser using a Netscape-formatted cookie exporter extension (e.g., *Get cookies.txt LOCALLY*).
2. Save the file as `cookies.txt` inside the `backend/` directory:
   ```
   OffiqSave/backend/cookies.txt
   ```
3. The backend will automatically pass `cookies.txt` on fallback requests.
