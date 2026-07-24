export interface FacebookMediaVariant {
  quality: 'hd' | 'sd';
  url: string;
}

export interface FacebookParsedResult {
  title?: string;
  author?: string;
  thumbnail?: string;
  mediaType: 'VIDEO' | 'IMAGE' | 'GALLERY';
  hdUrl?: string;
  sdUrl?: string;
  images?: string[];
  duration?: number;
}
