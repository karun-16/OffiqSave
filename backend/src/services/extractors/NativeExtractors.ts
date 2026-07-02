import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { MediaInfo } from '../downloaderService';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

const IMAGE_EXTS = /\.(jpeg|jpg|gif|png|webp|avif|bmp|svg)($|\?)/i;
const VIDEO_EXTS = /\.(mp4|mov|mkv|webm|avi|m4v)($|\?)/i;
const AUDIO_EXTS = /\.(mp3|aac|flac|wav|m4a|ogg)($|\?)/i;

const BROWSER_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache',
};

const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');
let _cachedCookies = '';
let _lastCookieRead = 0;

function getHeadersForUrl(url: string): Record<string, string> {
    const headers = { ...BROWSER_HEADERS };
    
    // Only attempt to read cookies if the file exists
    if (fs.existsSync(COOKIES_FILE)) {
        try {
            // Basic cache to avoid reading the file on every single fetch
            const stat = fs.statSync(COOKIES_FILE);
            if (stat.mtimeMs > _lastCookieRead) {
                _lastCookieRead = stat.mtimeMs;
                const content = fs.readFileSync(COOKIES_FILE, 'utf8');
                const lines = content.split('\n');
                const cookies: string[] = [];
                for (const line of lines) {
                    if (line.startsWith('#') || !line.trim()) continue;
                    const parts = line.split('\t');
                    if (parts.length >= 7) {
                        const name = parts[5];
                        const value = parts[6].trim();
                        cookies.push(`${name}=${value}`);
                    }
                }
                _cachedCookies = cookies.join('; ');
            }
            if (_cachedCookies) {
                headers['Cookie'] = _cachedCookies;
            }
        } catch (e) {
            // Ignore cookie read errors
        }
    }
    
    return headers;
}

function extFromUrl(url: string): string {
    const m = url.match(/\.([a-zA-Z0-9]{2,5})(?:\?.*)?$/);
    return m ? m[1].toLowerCase() : 'jpg';
}

function filenameFromUrl(url: string): string {
    return url.split('/').pop()?.split('?')[0] || 'image';
}


// ─────────────────────────────────────────────────────────────────────────────
// Instagram
// ─────────────────────────────────────────────────────────────────────────────
export interface ClassificationResult {
    type: 'IMAGE' | 'GALLERY' | 'VIDEO' | 'UNKNOWN';
    info?: MediaInfo;
}

export async function extractInstagramNative(url: string): Promise<ClassificationResult> {
    try {
        const response = await fetch(url, { headers: getHeadersForUrl(url) });
        if (!response.ok) return { type: 'UNKNOWN' };
        const html = await response.text();
        const $ = cheerio.load(html);

        let isVideo = false;
        let isGallery = false;
        let title = $('meta[property="og:title"]').attr('content') || 'Instagram Post';
        let description = $('meta[property="og:description"]').attr('content') || '';
        let ogImage = $('meta[property="og:image"]').attr('content') || '';
        let images: Array<{ id: string; url: string; format: string }> = [];

        const ogType = $('meta[property="og:type"]').attr('content') || '';
        if (ogType === 'video') isVideo = true;

        // Inspect application/ld+json
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || '{}');
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                    if (item['@type'] === 'VideoObject') isVideo = true;
                    if (item['@type'] === 'ImageObject') {
                         if (!isVideo) isGallery = false;
                    }
                }
            } catch (e) {}
        });

        // Inspect __additionalDataLoaded and __NEXT_DATA__
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (nextDataMatch) {
            try {
                const nextData = JSON.parse(nextDataMatch[1]);
                const items = nextData?.props?.pageProps?.routeProps?.items || [];
                if (items.length > 0) {
                    const item = items[0];
                    if (item.video_versions) isVideo = true;
                    if (item.carousel_media) {
                        isGallery = true;
                        for (const media of item.carousel_media) {
                            if (media.video_versions) isVideo = true;
                            if (media.image_versions2?.candidates?.length > 0) {
                                images.push({ id: media.id, url: media.image_versions2.candidates[0].url, format: 'jpg' });
                            }
                        }
                    }
                }
            } catch (e) {}
        }

        // SharedData extraction (fallback)
        const sharedDataMatch = html.match(/"shortcode_media"\s*:\s*(\{.*?"__typename".*?\})/s);
        if (sharedDataMatch && !isVideo && !isGallery) {
            try {
                const partial = sharedDataMatch[0];
                if (partial.includes('"is_video":true')) isVideo = true;
                const sidecarMatch = partial.match(/"edge_sidecar_to_children":\s*\{.*?"edges":\s*(\[.*?\])/s);
                if (sidecarMatch) {
                    isGallery = true;
                    const edges = JSON.parse(sidecarMatch[1]);
                    for (const edge of edges) {
                        const node = edge?.node;
                        if (node?.is_video) isVideo = true;
                        if (node?.__typename === 'GraphImage' && node?.display_url) {
                            images.push({ id: node.id || `ig-${images.length}`, url: node.display_url, format: 'jpg' });
                        }
                    }
                }
            } catch (_) {}
        }

        if (isVideo) {
            return {
                type: 'VIDEO',
                info: {
                    title, thumbnail: ogImage, duration: 0, platform: 'Instagram',
                    formats: [], mediaType: 'video'
                }
            };
        }

        if (isGallery && images.length > 1) {
            return {
                type: 'GALLERY',
                info: {
                    title, thumbnail: images[0].url, duration: 0, platform: 'Instagram',
                    uploader: description.split(' ')[0] || undefined, formats: [],
                    mediaType: 'gallery', images
                }
            };
        }

        if (ogImage) {
            return {
                type: 'IMAGE',
                info: {
                    title, thumbnail: ogImage, duration: 0, platform: 'Instagram',
                    formats: [], mediaType: 'image', images: [{ id: 'ig', url: ogImage, format: 'jpg' }]
                }
            };
        }

        return { type: 'UNKNOWN' };
    } catch (_) {
        return { type: 'UNKNOWN' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facebook
// ─────────────────────────────────────────────────────────────────────────────

export async function extractFacebookNative(url: string): Promise<ClassificationResult> {
    // Videos / Reels: let yt-dlp handle them
    if (url.includes('/videos/') || url.includes('/reel') || url.includes('/watch')) return { type: 'VIDEO' };

    try {
        const response = await fetch(url, { headers: getHeadersForUrl(url) });
        if (!response.ok) return { type: 'UNKNOWN' };
        const html = await response.text();
        const $ = cheerio.load(html);

        const ogType = $('meta[property="og:type"]').attr('content') || '';
        if (ogType.includes('video')) return { type: 'VIDEO' };

        // Collect all og:image tags (some pages embed multiple)
        const ogImages: string[] = [];
        $('meta[property="og:image"]').each((_, el) => {
            const content = $(el).attr('content');
            if (content) ogImages.push(content);
        });

        const title = $('meta[property="og:title"]').attr('content') || 'Facebook Post';

        if (ogImages.length === 0) return { type: 'UNKNOWN' };

        if (ogImages.length === 1) {
            return {
                type: 'IMAGE',
                info: {
                    title,
                    thumbnail: ogImages[0],
                    duration: 0,
                    platform: 'Facebook',
                    formats: [],
                    mediaType: 'image',
                    images: [{ id: 'fb', url: ogImages[0], format: 'jpg' }]
                }
            };
        }

        const images = ogImages.map((u, i) => ({ id: `fb-${i}`, url: u, format: 'jpg' }));
        return {
            type: 'GALLERY',
            info: {
                title,
                thumbnail: images[0].url,
                duration: 0,
                platform: 'Facebook',
                formats: [],
                mediaType: 'gallery',
                images
            }
        };
    } catch (_) {
        return { type: 'UNKNOWN' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Twitter / X
// ─────────────────────────────────────────────────────────────────────────────

export async function extractTwitterNative(url: string): Promise<ClassificationResult> {
    try {
        // Use the oEmbed endpoint for metadata
        const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&dnt=true`;
        const oEmbedRes = await fetch(oEmbedUrl, { headers: BROWSER_HEADERS }).catch(() => null);
        
        // Try OpenGraph via direct page fetch
        const pageRes = await fetch(url, { headers: BROWSER_HEADERS }).catch(() => null);
        if (!pageRes?.ok) {
            // Fallback: try fxtwitter / vxtwitter for image extraction
            return await extractTwitterViaFxTwitter(url);
        }

        const html = await pageRes.text();
        const $ = cheerio.load(html);

        const ogType = $('meta[property="og:type"]').attr('content') || '';
        // If explicitly video, fall back to yt-dlp
        if (ogType === 'video') return { type: 'VIDEO' };

        // Collect twitter:image and og:image
        const images: Array<{ id: string; url: string; format: string }> = [];

        $('meta[name="twitter:image"], meta[name="twitter:image:src"], meta[property="og:image"]').each((i, el) => {
            const content = $(el).attr('content');
            if (content && !images.find(img => img.url === content)) {
                images.push({ id: `tw-${i}`, url: content, format: extFromUrl(content) });
            }
        });

        if (images.length === 0) {
            // Try fxtwitter API as fallback
            return await extractTwitterViaFxTwitter(url);
        }

        const title = $('meta[property="og:title"]').attr('content') || 
                      $('meta[name="twitter:title"]').attr('content') || 'X (Twitter) Post';
        const author = $('meta[name="twitter:creator"]').attr('content') || 
                       $('meta[property="og:site_name"]').attr('content') || '';

        if (images.length === 1) {
            return {
                type: 'IMAGE',
                info: {
                    title,
                    thumbnail: images[0].url,
                    duration: 0,
                    platform: 'X (Twitter)',
                    uploader: author || undefined,
                    formats: [],
                    mediaType: 'image',
                    images
                }
            };
        }

        return {
            type: 'GALLERY',
            info: {
                title,
                thumbnail: images[0].url,
                duration: 0,
                platform: 'X (Twitter)',
                uploader: author || undefined,
                formats: [],
                mediaType: 'gallery',
                images
            }
        };
    } catch (_) {
        return { type: 'UNKNOWN' };
    }
}

async function extractTwitterViaFxTwitter(url: string): Promise<ClassificationResult> {
    try {
        // Convert to fxtwitter / vxtwitter API
        const apiUrl = url
            .replace('https://twitter.com', 'https://api.fxtwitter.com')
            .replace('https://x.com', 'https://api.fxtwitter.com');
        
        const res = await fetch(apiUrl, {
            headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] }
        });
        if (!res.ok) return { type: 'UNKNOWN' };

        const data = await res.json() as any;
        const tweet = data?.tweet;
        if (!tweet) return { type: 'UNKNOWN' };

        // fxtwitter indicates video directly
        if (tweet.media?.video || tweet.media?.videos?.length > 0) return { type: 'VIDEO' };

        const title = tweet.text || 'X (Twitter) Post';
        const author = tweet.author?.name || tweet.author?.screen_name || '';
        const authorUrl = tweet.author?.url || (tweet.author?.screen_name ? `https://twitter.com/${tweet.author.screen_name}` : undefined);
        const media = tweet.media;

        if (!media || !media.photos || media.photos.length === 0) return { type: 'UNKNOWN' };

        const images = (media.photos as any[]).map((p, i) => ({
            id: `tw-${i}`,
            url: p.url,
            width: p.width,
            height: p.height,
            format: extFromUrl(p.url)
        }));

        const isGallery = images.length > 1;
        return {
            type: isGallery ? 'GALLERY' : 'IMAGE',
            info: {
                title,
                thumbnail: images[0].url,
                duration: 0,
                platform: 'X (Twitter)',
                uploader: author || undefined,
                uploader_url: authorUrl,
                formats: [],
                mediaType: isGallery ? 'gallery' : 'image',
                images
            }
        };
    } catch (_) {
        return { type: 'UNKNOWN' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reddit
// ─────────────────────────────────────────────────────────────────────────────

export async function extractRedditNative(url: string): Promise<ClassificationResult> {
    try {
        // Normalize to json endpoint
        const jsonUrl = url.split('?')[0].replace(/\/$/, '') + '.json';
        const response = await fetch(jsonUrl, { headers: { ...BROWSER_HEADERS, 'Accept': 'application/json' } });
        if (!response.ok) return { type: 'UNKNOWN' };

        const data = await response.json() as any;
        const post = data[0]?.data?.children[0]?.data;
        if (!post) return { type: 'UNKNOWN' };

        // Videos -> yt-dlp
        if (post.is_video || post.post_hint === 'hosted:video') return { type: 'VIDEO' };

        const title = post.title || 'Reddit Post';
        const uploader = post.author as string | undefined;
        const uploader_url = uploader ? `https://reddit.com/user/${uploader}` : undefined;

        // Gallery posts
        if (post.is_gallery && post.gallery_data && post.media_metadata) {
            const items: any[] = post.gallery_data.items;
            const images = items.map((item: any, idx: number) => {
                const media = post.media_metadata[item.media_id];
                // Prefer source (s) over resolutions (p) array – decode HTML entities
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

            if (images.length === 0) return { type: 'UNKNOWN' };
            if (images.length === 1) {
                return {
                    type: 'IMAGE',
                    info: {
                        title, thumbnail: images[0].url, duration: 0, platform: 'Reddit',
                        uploader, uploader_url, formats: [], mediaType: 'image', images
                    }
                };
            }
            return {
                type: 'GALLERY',
                info: {
                    title, thumbnail: images[0].url, duration: 0, platform: 'Reddit',
                    uploader, uploader_url, formats: [], mediaType: 'gallery', images
                }
            };
        }

        // Single image post (post_hint === 'image')
        if (post.post_hint === 'image' && post.url) {
            const imgUrl: string = post.url;
            return {
                type: 'IMAGE',
                info: {
                    title, thumbnail: imgUrl, duration: 0, platform: 'Reddit',
                    uploader, uploader_url, formats: [], mediaType: 'image',
                    images: [{ id: 'img1', url: imgUrl, format: extFromUrl(imgUrl) }]
                }
            };
        }

        // Reddit-hosted image: direct URL with image extension OR i.redd.it hostname
        if (post.url) {
            const postUrl: string = post.url;
            const isIReddIt = postUrl.includes('i.redd.it');
            const hasImageExt = IMAGE_EXTS.test(postUrl);
            
            if (isIReddIt || hasImageExt) {
                return {
                    type: 'IMAGE',
                    info: {
                        title, thumbnail: postUrl, duration: 0, platform: 'Reddit',
                        uploader, uploader_url, formats: [], mediaType: 'image',
                        images: [{ id: 'img1', url: postUrl, format: extFromUrl(postUrl) || 'jpg' }]
                    }
                };
            }
        }

        // Check preview images (Reddit sometimes has these even when post_hint isn't 'image')
        if (post.preview?.images?.[0]?.source?.url && !post.is_video) {
            const preview = post.preview.images[0];
            const sourceUrl: string = preview.source.url.replace(/&amp;/g, '&');
            if (sourceUrl && !sourceUrl.includes('external-preview')) {
                return {
                    type: 'IMAGE',
                    info: {
                        title, thumbnail: sourceUrl, duration: 0, platform: 'Reddit',
                        uploader, uploader_url, formats: [], mediaType: 'image',
                        images: [{ id: 'img1', url: sourceUrl, format: extFromUrl(sourceUrl) || 'jpg' }]
                    }
                };
            }
        }

        // Reddit video → let yt-dlp handle
        if (post.is_video) return { type: 'VIDEO' };

        return { type: 'UNKNOWN' };
    } catch (_) {
        return { type: 'UNKNOWN' };
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Pinterest
// ─────────────────────────────────────────────────────────────────────────────

export async function extractPinterestNative(url: string): Promise<ClassificationResult> {
    try {
        const response = await fetch(url, { headers: getHeadersForUrl(url) });
        if (!response.ok) return { type: 'UNKNOWN' };
        const html = await response.text();
        const $ = cheerio.load(html);

        const ogType = $('meta[property="og:type"]').attr('content') || '';
        if (ogType === 'video') return { type: 'VIDEO' };

        // Pinterest embeds a JSON data blob inside a <script> tag
        let bestImageUrl = '';
        $('script[type="application/json"]').each((_, el) => {
            if (bestImageUrl) return;
            try {
                const raw = $(el).html() || '';
                const parsed = JSON.parse(raw);
                // Traverse to find orig image
                const str = JSON.stringify(parsed);
                const origMatch = str.match(/"orig"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
                if (origMatch) bestImageUrl = origMatch[1].replace(/\\\//g, '/');
            } catch (_) {}
        });

        const ogImage = $('meta[property="og:image"]').attr('content') || '';
        const imageUrl = bestImageUrl || ogImage;
        const title = $('meta[property="og:title"]').attr('content') || 'Pinterest Pin';

        if (!imageUrl) return { type: 'UNKNOWN' };

        // Upgrade Pinterest thumbnail to full resolution
        const fullResUrl = imageUrl
            .replace('/236x/', '/originals/')
            .replace('/474x/', '/originals/')
            .replace('/564x/', '/originals/')
            .replace('/736x/', '/originals/');

        return {
            type: 'IMAGE',
            info: {
                title,
                thumbnail: imageUrl,
                duration: 0,
                platform: 'Pinterest',
                formats: [],
                mediaType: 'image',
                images: [{ id: 'pin', url: fullResUrl || imageUrl, format: extFromUrl(imageUrl) || 'jpg' }]
            }
        };
    } catch (_) {
        return { type: 'UNKNOWN' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic
// ─────────────────────────────────────────────────────────────────────────────

export async function extractGenericNative(url: string): Promise<ClassificationResult> {
    try {
        const response = await fetch(url, { headers: BROWSER_HEADERS });
        if (!response.ok) return { type: 'UNKNOWN' };
        
        const contentType = response.headers.get('content-type') || '';
        
        // If it's literally an image
        if (contentType.startsWith('image/')) {
            const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
            return {
                type: 'IMAGE',
                info: {
                    title: 'Direct Image',
                    thumbnail: url,
                    duration: 0,
                    platform: 'Direct URL',
                    formats: [],
                    mediaType: 'image',
                    images: [{ id: 'direct', url, format: ext }]
                }
            };
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const ogType = $('meta[property="og:type"]').attr('content') || '';
        if (ogType.includes('video')) return { type: 'VIDEO' };

        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Generic Media';
        const ogImage = $('meta[property="og:image"]').attr('content');
        const twitterImage = $('meta[name="twitter:image"]').attr('content') || $('meta[name="twitter:image:src"]').attr('content');
        
        const imageUrl = ogImage || twitterImage;
        if (!imageUrl) return { type: 'UNKNOWN' };

        return {
            type: 'IMAGE',
            info: {
                title,
                thumbnail: imageUrl,
                duration: 0,
                platform: 'Generic URL',
                formats: [],
                mediaType: 'image',
                images: [{ id: 'generic', url: imageUrl, format: extFromUrl(imageUrl) || 'jpg' }]
            }
        };
    } catch (_) {
        return { type: 'UNKNOWN' };
    }
}
