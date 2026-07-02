export type MediaType = 'IMAGE' | 'VIDEO' | 'GALLERY' | 'UNKNOWN';

export interface ClassifierResult {
    platform: string;
    urlType: string;
    expectedMedia: MediaType;
}

export interface ExtractionResult {
    mediaType: MediaType;
    title: string;
    author: string;
    thumbnail: string;
    images?: Array<{ id: string; url: string; width?: number; height?: number; format: string; filename?: string; downloadUrl?: string }>;
    videos?: any[];
    formats?: any[];
    duration: number;
    source: string;
    metadata?: any;
}
