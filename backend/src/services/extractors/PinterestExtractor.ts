import * as cheerio from 'cheerio';
import { ExtractionResult } from '../types';
import { getHeadersForUrl, extFromUrl } from './utils';

export class PinterestExtractor {
    static async extract(url: string): Promise<ExtractionResult> {
        try {
            const response = await fetch(url, { headers: getHeadersForUrl(url) });
            if (!response.ok) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Pinterest' };
            const html = await response.text();
            const $ = cheerio.load(html);

            const ogType = $('meta[property="og:type"]').attr('content') || '';
            if (ogType === 'video') return { mediaType: 'VIDEO', title: '', author: '', thumbnail: '', duration: 0, source: 'Pinterest' };

            let bestImageUrl = '';
            $('script[type="application/json"]').each((_, el) => {
                if (bestImageUrl) return;
                try {
                    const raw = $(el).html() || '';
                    const parsed = JSON.parse(raw);
                    const str = JSON.stringify(parsed);
                    const origMatch = str.match(/"orig"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
                    if (origMatch) bestImageUrl = origMatch[1].replace(/\\\//g, '/');
                } catch (_) {}
            });

            const ogImage = $('meta[property="og:image"]').attr('content') || '';
            const imageUrl = bestImageUrl || ogImage;
            const title = $('meta[property="og:title"]').attr('content') || 'Pinterest Pin';

            if (!imageUrl) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Pinterest' };

            const fullResUrl = imageUrl
                .replace('/236x/', '/originals/')
                .replace('/474x/', '/originals/')
                .replace('/564x/', '/originals/')
                .replace('/736x/', '/originals/');

            return {
                mediaType: 'IMAGE', title, author: '', thumbnail: imageUrl,
                images: [{ id: 'pin', url: fullResUrl || imageUrl, format: extFromUrl(imageUrl) || 'jpg' }],
                duration: 0, source: 'Pinterest'
            };
        } catch (_) {
            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Pinterest' };
        }
    }
}
