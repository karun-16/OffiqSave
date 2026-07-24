export interface TwitterVariant {
  bitrate?: number;
  content_type?: string;
  url: string;
}

export interface TwitterMediaEntity {
  id?: number | string;
  id_str?: string;
  media_key?: string;
  media_url_https?: string;
  type?: 'photo' | 'video' | 'animated_gif';
  video_info?: {
    aspect_ratio?: number[];
    duration_millis?: number;
    variants?: TwitterVariant[];
  };
  sizes?: any;
}

export interface TwitterVideo {
  id: string;
  mediaKey?: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  variants: TwitterVariant[];
}

export interface TwitterParsedResult {
  tweetId?: string;
  author?: string;
  title?: string;
  thumbnail?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GALLERY' | 'AUDIO';
  images?: Array<{ url: string; width?: number; height?: number }>;
  variants?: TwitterVariant[];
  videos?: TwitterVideo[];
  duration?: number;
}
