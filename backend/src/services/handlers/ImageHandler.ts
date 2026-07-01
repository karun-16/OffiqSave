import { BaseHandler } from './BaseHandler';
import { MediaInfo } from '../downloaderService';
import cheerio from 'cheerio';

export class ImageHandler extends BaseHandler {
    constructor() {
        super();
        this.platformName = 'Image Extractor';
    }

    protected getExtraOptions() {
        return {};
    }

    async getInfo(rawUrl: string): Promise<MediaInfo> {
        const url = this.normalizeUrl(rawUrl);
        const startTime = performance.now();
        this.log(`Attempting to extract image metadata for: ${url}`);
        
        try {
            // First do a HEAD request to check if it's a direct image URL
            const headResponse = await fetch(url, { method: 'HEAD' }).catch(() => null);
            let contentType = headResponse?.headers.get('content-type');
            
            if (contentType?.startsWith('image/')) {
                const ext = contentType.split('/')[1] || 'jpg';
                const size = headResponse?.headers.get('content-length') ? parseInt(headResponse.headers.get('content-length')!) : 0;
                const filename = new URL(url).pathname.split('/').pop() || `image.${ext}`;
                return {
                    title: filename,
                    thumbnail: url,
                    duration: 0,
                    platform: 'Direct Image',
                    formats: [{
                        format_id: 'original',
                        ext: ext,
                        url: url,
                        filesize: size,
                        format_note: 'Original Quality'
                    }],
                    mediaType: 'image'
                };
            }

            // Fallback: fetch HTML and parse OpenGraph tags
            const response = await fetch(url);
            const html = await response.text();
            const $ = cheerio.load(html);

            const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
            const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Extracted Image';
            
            if (ogImage) {
                return {
                    title: title,
                    thumbnail: ogImage,
                    duration: 0,
                    platform: new URL(url).hostname,
                    formats: [{
                        format_id: 'original',
                        ext: 'jpg',
                        url: ogImage,
                        format_note: 'Original Quality'
                    }],
                    mediaType: 'image'
                };
            }
            
            throw new Error('No image found at this URL');

        } catch (e: any) {
            this.log('ImageHandler error:', e.message);
            throw new Error("This media couldn't be accessed or no image was found.");
        }
    }

    async download(rawUrl: string, formatId: string): Promise<string> {
        // Not used directly if we stream from frontend, but we can implement it
        // Or if DownloaderService calls it, we can fetch and write to tmp.
        throw new Error('Image download should stream directly or use yt-dlp fallback.');
    }
}
