import * as cheerio from 'cheerio';
import { ExtractionResult } from '../types';
import { getHeadersForUrl, extFromUrl, BROWSER_HEADERS } from './utils';

export class TwitterExtractor {
    static async extract(url: string): Promise<ExtractionResult> {
        try {
            const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&dnt=true`;
            const oEmbedRes = await fetch(oEmbedUrl, { headers: BROWSER_HEADERS }).catch(() => null);
            
            const pageRes = await fetch(url, { headers: BROWSER_HEADERS }).catch(() => null);
            if (!pageRes?.ok) {
                return await this.extractViaFxTwitter(url);
            }

            const html = await pageRes.text();
            const $ = cheerio.load(html);

            const ogType = $('meta[property="og:type"]').attr('content') || '';
            if (ogType === 'video') {
                const res = { mediaType: 'VIDEO' as const, title: '', author: '', thumbnail: '', duration: 0, source: 'Twitter' };
                console.log("===== RETURN OBJECT =====");
                console.dir(res, { depth: null });
                return res;
            }

            const images: Array<{ id: string; url: string; format: string }> = [];

            $('meta[name="twitter:image"], meta[name="twitter:image:src"], meta[property="og:image"]').each((i, el) => {
                const content = $(el).attr('content');
                if (content && !images.find(img => img.url === content)) {
                    images.push({ id: `tw-${i}`, url: content, format: extFromUrl(content) });
                }
            });

            if (images.length === 0) {
                return await this.extractViaFxTwitter(url);
            }

            const title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || 'X (Twitter) Post';
            const author = $('meta[name="twitter:creator"]').attr('content') || $('meta[property="og:site_name"]').attr('content') || '';

            if (images.length === 1) {
                const res = {
                    mediaType: 'IMAGE' as const, title, author, thumbnail: images[0].url,
                    images, duration: 0, source: 'Twitter'
                };
                console.log("===== RETURN OBJECT =====");
                console.dir(res, { depth: null });
                return res;
            }

            const res = {
                mediaType: 'GALLERY' as const, title, author, thumbnail: images[0].url,
                images, duration: 0, source: 'Twitter'
            };
            console.log("===== RETURN OBJECT =====");
            console.dir(res, { depth: null });
            return res;
        } catch (_) {
            const res = { mediaType: 'UNKNOWN' as const, title: '', author: '', thumbnail: '', duration: 0, source: 'Twitter' };
            console.log("===== RETURN OBJECT =====");
            console.dir(res, { depth: null });
            return res;
        }
    }

    private static async extractViaFxTwitter(url: string): Promise<ExtractionResult> {
        try {
            const apiUrl = url
                .replace('https://twitter.com', 'https://api.fxtwitter.com')
                .replace('https://x.com', 'https://api.fxtwitter.com');
            
            const res = await fetch(apiUrl, {
                headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] }
            });
            if (!res.ok) {
                const result = { mediaType: 'UNKNOWN' as const, title: '', author: '', thumbnail: '', duration: 0, source: 'Twitter' };
                console.log("===== RETURN OBJECT =====");
                console.dir(result, { depth: null });
                return result;
            }

            const data = await res.json() as any;
            const tweet = data?.tweet;
            if (!tweet) {
                const result = { mediaType: 'UNKNOWN' as const, title: '', author: '', thumbnail: '', duration: 0, source: 'Twitter' };
                console.log("===== RETURN OBJECT =====");
                console.dir(result, { depth: null });
                return result;
            }

            if (tweet.media?.video || tweet.media?.videos?.length > 0) {
                const result = { mediaType: 'VIDEO' as const, title: '', author: '', thumbnail: '', duration: 0, source: 'Twitter' };
                console.log("===== RETURN OBJECT =====");
                console.dir(result, { depth: null });
                return result;
            }

            const title = tweet.text || 'X (Twitter) Post';
            const author = tweet.author?.name || tweet.author?.screen_name || '';
            const media = tweet.media;

            if (!media || !media.photos || media.photos.length === 0) {
                const result = { mediaType: 'UNKNOWN' as const, title: '', author: '', thumbnail: '', duration: 0, source: 'Twitter' };
                console.log("===== RETURN OBJECT =====");
                console.dir(result, { depth: null });
                return result;
            }

            const images = (media.photos as any[]).map((p, i) => ({
                id: `tw-${i}`, url: p.url, width: p.width, height: p.height, format: extFromUrl(p.url)
            }));

            const isGallery = images.length > 1;
            const result = {
                mediaType: isGallery ? ('GALLERY' as const) : ('IMAGE' as const), title, author, thumbnail: images[0].url,
                images, duration: 0, source: 'Twitter'
            };
            console.log("===== RETURN OBJECT =====");
            console.dir(result, { depth: null });
            return result;
        } catch (_) {
            const result = { mediaType: 'UNKNOWN' as const, title: '', author: '', thumbnail: '', duration: 0, source: 'Twitter' };
            console.log("===== RETURN OBJECT =====");
            console.dir(result, { depth: null });
            return result;
        }
    }
}
