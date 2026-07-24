export type MediaType = 'IMAGE' | 'VIDEO' | 'GALLERY' | 'AUDIO' | 'DOCUMENT';

export interface ImageMedia {
  id?: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  filename?: string;
  downloadUrl?: string;
}

export interface FormatMedia {
  id?: string;
  url: string;
  quality?: string;
  resolution?: string;
  width?: number;
  height?: number;
  ext?: string;
  filesize?: number;
  bitrate?: number;
  vcodec?: string;
  acodec?: string;
  format_id?: string;
  format_note?: string;
  abr?: number;
  tbr?: number;
  filesize_approx?: number;
}

export interface AudioMedia {
  id?: string;
  url: string;
  ext?: string;
  bitrate?: number;
  title?: string;
}

export interface VideoMedia {
  id: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  formats: FormatMedia[];
}

export interface MediaInfo {
  platform: string;
  mediaType: MediaType;
  title?: string;
  description?: string;
  author?: string;
  thumbnail?: string;
  images?: ImageMedia[];
  formats?: FormatMedia[];
  videos?: VideoMedia[];
  audio?: AudioMedia[];
  duration?: number;
  width?: number;
  height?: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface MediaExtractor {
  platform(): string;
  supports(url: string): boolean;
  extract(url: string): Promise<MediaInfo>;
}
