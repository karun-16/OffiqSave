# OffiqSave

OffiqSave is a premium SaaS-quality universal media downloader and converter.

## Prerequisites
- Node.js (v18 or higher)
- **FFmpeg**: Must be installed and available in your system PATH.
- **yt-dlp**: `yt-dlp-exec` manages its own binary, but having python/yt-dlp on system is beneficial.

## Project Structure
- `/frontend` - Next.js 15 App Router, React 19, Tailwind CSS v4, Framer Motion
- `/backend` - Node.js Express Server, fluent-ffmpeg, yt-dlp-exec

## Quick Start

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```
The backend runs on `http://localhost:4000`.

### 2. Start the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend runs on `http://localhost:3000`.

Open your browser to `http://localhost:3000`.

## Architecture Details
- **Frontend**: Utilizes Next.js App Router for optimal performance. Glassmorphism UI is achieved using Tailwind CSS v4. Animations are powered by Framer Motion. The UI dynamically adapts its layout depending on the exact media type returned (Video, Audio, Single Image, or Gallery/Carousel).
- **Backend**: Exposes `/api/info`, `/api/download`, and `/api/convert`. It features a **Universal Media Extraction Engine** leveraging native platform scraping (via OpenGraph/JSON) for images and carousels, falling back to `yt-dlp` for complex video resolution and audio merging. Downloaded videos and audio are processed via `FFmpeg` and files are automatically cleaned up immediately after being streamed to the client.

## Features Built
- Universal Media Extraction: Natively supports fetching Single Images, Galleries (ZIP downloads), Videos, and Audio seamlessly from a single input field.
- Advanced Platform Support: Instagram, Reddit, Facebook, Pinterest, YouTube, TikTok, Vimeo, Dailymotion, Twitter (X), Telegram, Terabox, and generic URLs.
- Robust Authentication & Fallback: Implements intelligent multi-layered cookie retries via `yt-dlp` alongside blazing fast native JSON scraping.
- Beautiful glassmorphism UI with brand gradient `#2563EB`, `#3B82F6`, `#06B6D4`.
- Smart Input Validation & Adaptive State Management (Fetching -> Download/Convert -> Done).
- Format and quality selectors parsed directly from media metadata.
- Secure temporary file cleanup (without disk-buffering memory exhaustion).
- Responsive layout across all screen sizes.
