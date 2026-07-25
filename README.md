<h1 align="center">
  <img src="assets/logo.png" alt="OffiqSave Logo" width="48" valign="middle" />
  OffiqSave
</h1>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/karun-16/OffiqSave?style=social)](https://github.com/karun-16/OffiqSave)

OffiqSave is a modern universal media downloader supporting multiple social media platforms with high-quality downloads, gallery support, audio extraction, and a secure native download pipeline.

---

## Features

- **Universal media downloader**: Unified extraction engine supporting multiple social media platforms.
- **Download images**: Extract and download high-resolution single images.
- **Download galleries**: Multi-item carousel and gallery parsing with batch ZIP download generation.
- **Download videos**: HD, 2K, and 4K video extraction with synchronized audio tracks.
- **Audio extraction**: FFmpeg-powered conversion to high-quality MP3 and WAV audio formats.
- **Multiple quality selection**: Granular resolution, bitrate, and format selection options.
- **Native browser downloads**: Single-use token handshake delivering direct attachment responses to browsers.
- **Secure download pipeline**: Isolated stream execution and token validation.
- **Metadata caching**: In-memory caching delivering fast repeated request lookups.
- **Automatic temporary file cleanup**: Immediate disk unlinking upon stream transfer completion.
- **Responsive modern UI**: Next.js client built with Tailwind CSS, Lucide icons, and fluid UI states.
- **FFmpeg integration**: Server-side audio conversion and stream multiplexing.
- **yt-dlp integration**: Fallback processing engine for complex media sources.
- **Concurrent download support**: High-throughput non-blocking request handling.
- **Modular extractor architecture**: Extensible per-platform extractor pattern.

---

## Supported Platforms

| Platform | Images | Galleries | Videos | Audio | Status |
|---|:---:|:---:|:---:|:---:|:---:|
| **Instagram** | ✅ | ✅ | ✅ | ✅ | Supported |
| **X (Twitter)** | ✅ | ✅ | ✅ | ✅ | Supported |
| **Facebook** | ✅ | ❌ | ✅ | ✅ | Supported |
| **Pinterest** | ✅ | ✅ | ✅ | ✅ | Supported |
| **YouTube** | ❌ | ❌ | ✅ | ✅ | Supported |
| **Reddit** | ✅ | ✅ | ✅ | ✅ | Supported |

---

## Live Demo

Website  
*Coming Soon...*

---

## Tech Stack

### Frontend
- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**

### Backend
- **Node.js**
- **Express**
- **TypeScript**

### Media Processing
- **yt-dlp**
- **FFmpeg**

---

## Installation

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher
- FFmpeg installed and available on system `PATH`

### Step 1: Clone Repository
```bash
git clone https://github.com/karun-16/OffiqSave.git
cd OffiqSave
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 4: Start Services

**Start Backend Server:**
```bash
cd backend
npm run dev
```

**Start Frontend Client:**
```bash
cd frontend
npm run dev
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API server | `http://localhost:4000` |

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port for the Express backend server | `4000` |
| `FRONTEND_URL` | Allowed CORS origin URL for frontend client | `http://localhost:3000` |

---

## Usage

1. **Paste media URL**: Enter a valid media link from a supported platform into the input field.
2. **Fetch media**: Click the fetch button to parse metadata and available download streams.
3. **Preview media**: Review media details, title, thumbnail, and content preview.
4. **Select quality or format**: Choose your target video quality or audio extraction format (MP3/WAV).
5. **Download**: Click download to initiate direct browser file saving.

---

## Project Structure

```text
OffiqSave/
├── backend/
│   ├── src/
│   │   ├── classifier/         # Hostname classification
│   │   ├── common/             # Metadata caching
│   │   ├── controllers/        # Request controllers
│   │   ├── downloader/         # Execution engine
│   │   ├── extractors/         # Platform extractors
│   │   │   ├── facebook/
│   │   │   ├── instagram/
│   │   │   ├── pinterest/
│   │   │   ├── reddit/
│   │   │   ├── twitter/
│   │   │   └── youtube/
│   │   ├── ffmpeg/             # Audio transcoding
│   │   ├── router/             # Extractor routing engine
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # DownloaderService orchestration
│   │   ├── tests/              # Verification test suites
│   │   ├── utils/              # Helper utilities
│   │   └── index.ts            # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css     # Global styles
│   │   │   ├── layout.tsx      # App layout
│   │   │   └── page.tsx        # Downloader client interface
│   │   └── lib/                # Client utilities
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Architecture

- **Platform Router**: Classifies incoming hostnames and routes requests to the registered extractor.
- **Extractor Registry**: Manages platform handlers, executing native parsers with fallback to `yt-dlp`.
- **MediaInfo Contract**: Normalizes extraction responses into a unified JSON format for client rendering.
- **Download Pipeline**: Issues single-use download tokens, managing stream generation and response piping.
- **FFmpeg**: Transcodes media streams into MP3/WAV audio and multiplexes DASH streams.
- **yt-dlp Integration**: Handles stream extraction for complex video formats and fallback scenarios.

---

## Performance

- **Native browser downloads**: Attachment content disposition headers deliver direct file downloads.
- **Metadata caching**: `ExtractorCache` caches post metadata to eliminate redundant extraction overhead.
- **Concurrent downloads**: Non-blocking asynchronous job processing handles multiple requests simultaneously.
- **Temporary file cleanup**: Immediate disk unlinking upon response stream completion prevents storage accumulation.
- **Secure streaming pipeline**: Token handshake ensures validated stream delivery.

---

## Roadmap

### v1.0
- ✅ Instagram
- ✅ X (Twitter)
- ✅ Facebook
- ✅ Pinterest
- ✅ YouTube
- ✅ Reddit

### v1.1
- ⏳ Threads
- ⏳ LinkedIn
- ⏳ Vimeo
- ⏳ Dailymotion

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add AmazingFeature'`).
4. Push to your branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

GitHub: [https://github.com/karun-16](https://github.com/karun-16)
