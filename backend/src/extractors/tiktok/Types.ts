export interface TikTokParsedResult {
  title?: string;
  author?: string;
  thumbnail?: string;
  mediaType: 'VIDEO' | 'IMAGE' | 'GALLERY';
  videoUrl?: string;
  images?: string[];
  duration?: number;
}
