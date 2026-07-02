import * as cheerio from 'cheerio';
import { ExtractionResult } from '../types';
import { getHeadersForUrl } from './utils';

export class FacebookExtractor {
    static async extract(url: string): Promise<ExtractionResult> {
        if (url.includes('/videos/') || url.includes('/reel') || url.includes('/watch')) {
            return { mediaType: 'VIDEO', title: '', author: '', thumbnail: '', duration: 0, source: 'Facebook' };
        }

        try {
            const response = await fetch(url, { headers: getHeadersForUrl(url) });
            if (!response.ok) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Facebook' };
            const html = await response.text();
            const $ = cheerio.load(html);

            const ogType = $('meta[property="og:type"]').attr('content') || '';
            if (ogType.includes('video')) return { mediaType: 'VIDEO', title: '', author: '', thumbnail: '', duration: 0, source: 'Facebook' };

            const ogImages: string[] = [];
            $('meta[property="og:image"]').each((_, el) => {
                const content = $(el).attr('content');
                if (content) ogImages.push(content);
            });

            const title = $('meta[property="og:title"]').attr('content') || 'Facebook Post';

            if (ogImages.length === 0) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Facebook' };

            if (ogImages.length === 1) {
                return {
                    mediaType: 'IMAGE', title, author: '', thumbnail: ogImages[0],
                    images: [{ id: 'fb', url: ogImages[0], format: 'jpg' }], duration: 0, source: 'Facebook'
                };
            }

            const images = ogImages.map((u, i) => ({ id: `fb-${i}`, url: u, format: 'jpg' }));
            return {
                mediaType: 'GALLERY', title, author: '', thumbnail: images[0].url,
                images, duration: 0, source: 'Facebook'
            };
        } catch (_) {
            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Facebook' };
        }
    }
}
