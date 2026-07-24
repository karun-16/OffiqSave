export interface PinterestParsedResult {
  pinId?: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GALLERY';
  images?: string[];
  videoUrl?: string;
}
