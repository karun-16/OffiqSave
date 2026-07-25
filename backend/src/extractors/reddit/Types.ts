export interface RedditImageItem {
  id: string;
  url: string;
  downloadUrl: string;
  format: string;
  filename: string;
  width?: number;
  height?: number;
}

export interface RedditParsedResult {
  id?: string;
  title?: string;
  author?: string;
  subreddit?: string;
  permalink?: string;
  thumbnail?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GALLERY';
  images?: RedditImageItem[];
  videoUrl?: string;
  fallbackUrl?: string;
  isVideo?: boolean;
}
