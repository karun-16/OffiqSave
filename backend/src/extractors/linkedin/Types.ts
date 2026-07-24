export interface LinkedInParsedResult {
  title?: string;
  author?: string;
  thumbnail?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GALLERY';
  images?: string[];
  videoUrl?: string;
}
