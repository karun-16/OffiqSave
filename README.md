# OffiqSave

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/karun-16/OffiqSave?style=social)](https://github.com/karun-16/OffiqSave)

OffiqSave is a high-performance, open-source universal media extraction and download platform. Engineered with a decoupled Next.js web client and an Express-powered backend engine, OffiqSave enables users to seamlessly extract, preview, and download high-resolution images, multi-item galleries, reels, videos, and converted audio streams from top social platforms without watermarks or quality loss.

---

## Features

- **Universal Media Extraction**: Native extraction engines and fallback pipelines for social media platforms.
- **Native Browser Downloads**: Streamlined download token system delivering direct attachment responses to browser clients.
- **High-Quality Video & Audio**: Full HD, 2K, and 4K video downloads with optional FFmpeg-powered MP3 and WAV audio extraction.
- **Gallery & Carousel Support**: Multi-image and multi-video post parsing with batch ZIP download generation.
- **Multiple Quality Selection**: Granular bitrate and resolution selection options powered by unified metadata formatting.
- **Modern Responsive UI**: Built with Next.js, Tailwind CSS, Lucide icons, and fluid animation states.
- **Fast Metadata Extraction**: In-memory metadata caching (`ExtractorCache`) delivering sub-millisecond cached responses.
- **Secure & Efficient Pipeline**: Automatic single-use download tokens, stream piping, and immediate disk cleanup.

---

## Supported Platforms

| Platform | Images | Galleries | Videos | Audio | Status |
|---|:---:|:---:|:---:|:---:|:---:|
| **Instagram** | ✅ (Single Image) | ✅ (Carousels) | ✅ (Videos & Reels) | ✅ (Audio Extraction) | ✅ Supported |
| **X (Twitter)** | ✅ (Single Image) | ✅ (Multi-Image) | ✅ (Single & Multi-Video) | ✅ (Audio Extraction) | ✅ Supported |
| **Facebook** | ✅ (Single Image) | ❌ | ✅ (Videos & Reels) | ✅ (Audio Extraction) | ✅ Supported |
| **Pinterest** | ✅ (Single Image) | ✅ (Galleries) | ✅ (Videos) | ✅ (Audio Extraction) | ✅ Supported |
| **YouTube** | ❌ | ❌ | ✅ (Videos & Quality Selection) | ✅ (MP3 & WAV Extraction) | ✅ Supported |
| **Reddit** | ✅ (Single Image) | ✅ (Galleries) | ✅ (Videos & Animated Media) | ✅ (Audio Extraction) | ✅ Supported |

---

## Screenshots

### Hero UI
![Hero UI](https://raw.githubusercontent.com/karun-16/OffiqSave/main/docs/screenshots/hero-ui.png)

### Downloader Interface
![Downloader Interface](https://raw.githubusercontent.com/karun-16/OffiqSave/main/docs/screenshots/downloader-interface.png)

### Media Preview
![Media Preview](https://raw.githubusercontent.com/karun-16/OffiqSave/main/docs/screenshots/media-preview.png)

### Quality Selection
![Quality Selection](https://raw.githubusercontent.com/karun-16/OffiqSave/main/docs/screenshots/quality-selection.png)

---

## Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
- **Icons & UI**: [Lucide React](https://lucide.dev/)

### Backend
- **Runtime**: [Node.js 18+](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Caching**: NodeCache (`ExtractorCache`)

### Media Processing
- **Engine**: [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Transcoding**: [FFmpeg](https://ffmpeg.org/) & [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)

---

## Installation

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher
- FFmpeg installed and available on system `PATH`

### Step 1: Clone the Repository
```bash
git clone https://github.com/karun-16/OffiqSave.git
cd OffiqSave
```

### Step 2: Setup Backend
```bash
cd backend
npm install
```

### Step 3: Setup Frontend
```bash
cd ../frontend
npm install
```

### Step 4: Run Application

**Start Backend Server (Port 4000):**
```bash
cd backend
npm run dev
```

**Start Frontend Development Client (Port 3000):**
```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your web browser to start using OffiqSave.

---

## Environment Variables

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Backend (`backend/.env`)
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
```

---

## Usage

1. **Paste URL**: Insert any supported social media post URL into the main search input bar.
2. **Fetch Media**: Click **Fetch** to analyze the post and retrieve media metadata.
3. **Choose Quality**: Select your desired format (Video resolution, MP3/WAV Audio, or Image).
4. **Download**: Click **Download** to stream the file directly to your device via native browser download headers.

---

## Project Structure

```text
OffiqSave/
├── backend/
│   ├── src/
│   │   ├── classifier/         # Hostname & platform URL classification logic
│   │   ├── common/             # Metadata caching (ExtractorCache)
│   │   ├── controllers/        # Express API request controllers (mediaController)
│   │   ├── downloader/         # Unified Downloader Engine & yt-dlp execution
│   │   ├── extractors/         # Platform Extractor implementation registry
│   │   │   ├── facebook/
│   │   │   ├── instagram/
│   │   │   ├── pinterest/
│   │   │   ├── reddit/
│   │   │   ├── twitter/
│   │   │   └── youtube/
│   │   ├── ffmpeg/             # Audio transcoding & format conversion
│   │   ├── router/             # Extractor routing engine (PlatformRouter)
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # DownloaderService orchestration
│   │   ├── tests/              # Verification & regression test suites
│   │   ├── utils/              # Disk file cleanup & helper utilities
│   │   └── index.ts            # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css     # Design system & Tailwind styles
│   │   │   ├── layout.tsx      # Root application layout
│   │   │   └── page.tsx        # Interactive downloader client dashboard
│   │   └── lib/                # Utility helpers
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Architecture

OffiqSave utilizes a decoupled, layered pipeline designed for speed and reliability:

- **Platform Router**: Intercepts incoming target URLs, resolves canonical hostnames, and dispatches extraction tasks to matching platform handlers without domain collisions.
- **Extractor Registry**: Manages registered platform extractors (Instagram, Twitter, YouTube, Reddit, Pinterest, Facebook). Executes high-speed native scrapers first and falls back gracefully to `yt-dlp` if required.
- **MediaInfo Normalizer**: Unifies diverse platform payloads into a standard JSON schema containing thumbnails, media types, resolution options, and format specifications.
- **Download Token Pipeline**: Generates single-use UUID download tokens upon request preparation, ensuring secure client-server handshake for stream execution.
- **FFmpeg & yt-dlp Integration**: Handles audio extraction (m4a/webm to MP3/WAV), video stream merging (video+audio DASH formats), and multi-item gallery ZIP generation on the fly.

---

## Performance & Optimization

- **Native Browser Downloads**: Files are served directly via `Content-Disposition: attachment` headers, triggering native browser saving.
- **In-Memory Caching**: `ExtractorCache` caches parsed post metadata to eliminate redundant external HTTP requests on secondary downloads.
- **Automatic Disk Cleanup**: Downloaded temporary files and converted media streams are automatically unlinked upon stream completion.
- **High Concurrency**: Tested and verified under 20+ concurrent and 50+ sequential download loads with stable memory footprint.

---

## Roadmap

### v1.0 (Current Release)
- ✅ Instagram (Image, Carousel, Reel, Video, Audio)
- ✅ Twitter / X (Image, Gallery, Video, Audio)
- ✅ Facebook (Image, Reel, Video)
- ✅ Pinterest (Image, Gallery, Video)
- ✅ YouTube (Video, Quality Options, MP3, WAV)
- ✅ Reddit (Image, Gallery, Video, Animated Media)

### v1.1 (Planned)
- ⏳ Threads support
- ⏳ LinkedIn media support
- ⏳ Vimeo support
- ⏳ Dailymotion support

---

## Contributing

Contributions are welcome! If you'd like to report a bug or suggest a feature, please follow these steps:

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git checkout origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Author

Created and maintained by **[karun-16](https://github.com/karun-16)**.
