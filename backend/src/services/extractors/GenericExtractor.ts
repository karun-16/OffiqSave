import * as cheerio from 'cheerio';
import { ExtractionResult } from '../types';
import { BROWSER_HEADERS, extFromUrl } from './utils';

export class GenericExtractor {
    static async extract(url: string): Promise<ExtractionResult> {
        try {
            const response = await fetch(url, { headers: BROWSER_HEADERS });
            if (!response.ok) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Generic URL' };
            
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.startsWith('image/')) {
                const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
                return {
                    mediaType: 'IMAGE', title: 'Direct Image', author: '', thumbnail: url,
                    images: [{ id: 'direct', url, format: ext }], duration: 0, source: 'Direct URL'
                };
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            const ogType = $('meta[property="og:type"]').attr('content') || '';
            if (ogType.includes('video')) return { mediaType: 'VIDEO', title: '', author: '', thumbnail: '', duration: 0, source: 'Generic URL' };

            const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Generic Media';
            const ogImage = $('meta[property="og:image"]').attr('content');
            const twitterImage = $('meta[name="twitter:image"]').attr('content') || $('meta[name="twitter:image:src"]').attr('content');
            
            const imageUrl = ogImage || twitterImage;
            if (!imageUrl) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Generic URL' };

            return {
                mediaType: 'IMAGE', title, author: '', thumbnail: imageUrl,
                images: [{ id: 'generic', url: imageUrl, format: extFromUrl(imageUrl) || 'jpg' }],
                duration: 0, source: 'Generic URL'
            };
        } catch (_) {
            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Generic URL' };
        }
    }
}
