import { MediaInfo } from '../../common/types';

export interface InstagramMediaItem {
  id: string;
  url: string;
  width?: number;
  height?: number;
  is_video?: boolean;
  video_url?: string;
}

export interface InstagramParsedResult {
  shortcode?: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  images?: InstagramMediaItem[];
  videos?: InstagramMediaItem[];
  mediaType: 'IMAGE' | 'VIDEO' | 'GALLERY';
}
