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
- **Frontend**: Utilizes Next.js App Router for optimal performance. Glassmorphism UI is achieved using Tailwind CSS v4. Animations are powered by Framer Motion.
- **Backend**: Exposes `/api/info`, `/api/download`, and `/api/convert`. It securely downloads media using `yt-dlp` and processes conversions via `FFmpeg`. Downloaded files are automatically cleaned up immediately after being streamed to the client to prevent disk space exhaustion.

## Features Built
- Beautiful glassmorphism UI with brand gradient `#2563EB`, `#3B82F6`, `#06B6D4`.
- Input validation and state management (Fetching -> Download/Convert -> Done).
- Format and quality selectors parsed from `yt-dlp` metadata.
- Secure temporary file cleanup.
- Responsive layout across all screen sizes.
