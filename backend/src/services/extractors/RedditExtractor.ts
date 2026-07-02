import { ExtractionResult } from '../types';
import { getHeadersForUrl, extFromUrl, BROWSER_HEADERS } from './utils';

const IMAGE_EXTS = /\.(jpeg|jpg|gif|png|webp|avif|bmp|svg)($|\?)/i;

export class RedditExtractor {
    static async extract(url: string): Promise<ExtractionResult> {
        try {
            const jsonUrl = url.split('?')[0].replace(/\/$/, '') + '.json';
            const response = await fetch(jsonUrl, { headers: { ...BROWSER_HEADERS, 'Accept': 'application/json' } });
            if (!response.ok) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Reddit' };

            const data = await response.json() as any;
            const post = data[0]?.data?.children[0]?.data;
            if (!post) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Reddit' };

            if (post.is_video || post.post_hint === 'hosted:video') {
                return { mediaType: 'VIDEO', title: '', author: '', thumbnail: '', duration: 0, source: 'Reddit' };
            }

            const title = post.title || 'Reddit Post';
            const author = post.author as string || '';

            if (post.is_gallery && post.gallery_data && post.media_metadata) {
                const items: any[] = post.gallery_data.items;
                const images = items.map((item: any) => {
                    const media = post.media_metadata[item.media_id];
                    const rawUrl: string = (media?.s?.u || media?.s?.gif || '').replace(/&amp;/g, '&');
                    const ext = rawUrl.split('.').pop()?.split('?')[0] || (media?.m?.split('/')[1]) || 'jpg';
                    return {
                        id: item.media_id as string,
                        url: rawUrl,
                        width: media?.s?.x as number | undefined,
                        height: media?.s?.y as number | undefined,
                        format: ext
                    };
                }).filter((i: any) => i.url);

                if (images.length === 0) return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Reddit' };
                
                return {
                    mediaType: images.length === 1 ? 'IMAGE' : 'GALLERY',
                    title, author, thumbnail: images[0].url, images, duration: 0, source: 'Reddit'
                };
            }

            if (post.post_hint === 'image' && post.url) {
                return {
                    mediaType: 'IMAGE', title, author, thumbnail: post.url,
                    images: [{ id: 'img1', url: post.url, format: extFromUrl(post.url) }], duration: 0, source: 'Reddit'
                };
            }

            if (post.url && (post.url.includes('i.redd.it') || IMAGE_EXTS.test(post.url))) {
                return {
                    mediaType: 'IMAGE', title, author, thumbnail: post.url,
                    images: [{ id: 'img1', url: post.url, format: extFromUrl(post.url) || 'jpg' }], duration: 0, source: 'Reddit'
                };
            }

            if (post.preview?.images?.[0]?.source?.url && !post.is_video) {
                const sourceUrl: string = post.preview.images[0].source.url.replace(/&amp;/g, '&');
                if (sourceUrl && !sourceUrl.includes('external-preview')) {
                    return {
                        mediaType: 'IMAGE', title, author, thumbnail: sourceUrl,
                        images: [{ id: 'img1', url: sourceUrl, format: extFromUrl(sourceUrl) || 'jpg' }], duration: 0, source: 'Reddit'
                    };
                }
            }

            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Reddit' };
        } catch (_) {
            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Reddit' };
        }
    }
}
