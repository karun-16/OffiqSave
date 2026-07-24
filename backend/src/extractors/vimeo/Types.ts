export interface VimeoParsedResult {
  title?: string;
  author?: string;
  thumbnail?: string;
  duration?: number;
  formats?: Array<{ url: string; quality?: string; width?: number; height?: number; fps?: number }>;
}
