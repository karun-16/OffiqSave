import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { ExtractionResult } from '../types';

const DEBUG_DIR = path.join(process.cwd(), 'debug');

function saveDebugHtml(html: string) {
    if (!fs.existsSync(DEBUG_DIR)) {
        fs.mkdirSync(DEBUG_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(DEBUG_DIR, 'runtime-instagram.html'), html);
}

function normalizeUrl(urlStr: string): string {
    try {
        const parsed = new URL(urlStr);
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'igsh', 'fbclid', 'ref'];
        for (const param of paramsToRemove) parsed.searchParams.delete(param);
        return parsed.toString();
    } catch (e) {
        return urlStr;
    }
}

export class InstagramExtractor {
    static async extract(rawUrl: string): Promise<ExtractionResult> {
        const url = normalizeUrl(rawUrl);

        let html = '';
        try {
            html = await this.fetchHtml(url);
            saveDebugHtml(html);
        } catch (err: any) {
            throw new Error(`Unable to fetch Instagram media page: ${err.message}`);
        }

        const $ = cheerio.load(html);
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';

        const jsonObjects = this.discoverJsonBlocks(html);
        const polarisResult = this.traverseJson(jsonObjects, ogTitle, ogImage);

        if (polarisResult) {
            return polarisResult;
        }

        // OpenGraph LAST fallback thumbnail/image
        if (ogImage) {
            return {
                mediaType: 'IMAGE',
                title: ogTitle || 'Instagram Post',
                author: '',
                thumbnail: ogImage,
                images: [
                    {
                        id: 'ig-og',
                        url: ogImage,
                        downloadUrl: ogImage,
                        format: 'jpg',
                        filename: 'instagram_og.jpg',
                        width: 0,
                        height: 0
                    }
                ],
                duration: 0,
                source: 'Instagram'
            };
        }

        throw new Error(`Unable to extract Instagram media. It may be private or require authentication.`);
    }

    private static async fetchHtml(targetUrl: string): Promise<string> {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers,
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        return await response.text();
    }

    private static discoverJsonBlocks(html: string): any[] {
        const jsonObjects: any[] = [];
        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let match: RegExpExecArray | null;

        while ((match = scriptRegex.exec(html)) !== null) {
            const scriptContent = match[1] ? match[1].trim() : '';
            if (!scriptContent) continue;

            if (
                scriptContent.includes('ScheduledServerJS') ||
                scriptContent.includes('__bbox') ||
                scriptContent.includes('xig_polaris_media') ||
                scriptContent.includes('image_versions2') ||
                scriptContent.includes('carousel_media') ||
                scriptContent.includes('video_versions')
            ) {
                try {
                    const parsed = JSON.parse(scriptContent);
                    jsonObjects.push(parsed);
                    continue;
                } catch (_) {}

                const jsonSubmatches = scriptContent.match(/(\{[\s\S]*?\})/g);
                if (jsonSubmatches) {
                    for (const sub of jsonSubmatches) {
                        if (
                            sub.includes('xig_polaris_media') ||
                            sub.includes('image_versions2') ||
                            sub.includes('carousel_media') ||
                            sub.includes('video_versions')
                        ) {
                            try {
                                const parsedSub = JSON.parse(sub);
                                jsonObjects.push(parsedSub);
                            } catch (_) {}
                        }
                    }
                }
            }
        }
        return jsonObjects;
    }

    private static traverseJson(
        jsonObjects: any[],
        defaultTitle?: string,
        defaultOgImage?: string
    ): ExtractionResult | null {
        let result: ExtractionResult | null = null;
        const visited = new Set<any>();

        function search(node: any) {
            if (result) return;
            if (!node || typeof node !== 'object') return;
            if (visited.has(node)) return;
            visited.add(node);

            if (Array.isArray(node)) {
                for (const item of node) {
                    if (result) break;
                    search(item);
                }
                return;
            }

            if (node.xig_polaris_media) {
                const polarisRes = InstagramExtractor.extractPolarisMedia(node.xig_polaris_media, defaultTitle, defaultOgImage);
                if (polarisRes) {
                    result = polarisRes;
                    return;
                }
            }

            if (node.image_versions2 || node.carousel_media || (node.video_versions && Array.isArray(node.video_versions))) {
                const polarisRes = InstagramExtractor.extractPolarisMedia(node, defaultTitle, defaultOgImage);
                if (polarisRes) {
                    result = polarisRes;
                    return;
                }
            }

            for (const key of Object.keys(node)) {
                if (result) break;
                search(node[key]);
            }
        }

        for (const obj of jsonObjects) {
            if (result) break;
            search(obj);
        }

        return result;
    }

    private static extractPolarisMedia(
        node: any,
        defaultTitle?: string,
        defaultOgImage?: string
    ): ExtractionResult | null {
        if (!node || typeof node !== 'object') return null;

        const title = node.caption?.text || node.title || defaultTitle || 'Instagram Media';
        const author = node.owner?.username || node.user?.username || '';
        let thumbnail = defaultOgImage || '';

        // 1. VIDEO
        if (Array.isArray(node.video_versions) && node.video_versions.length > 0) {
            const videoUrl = node.video_versions[0].url;
            if (videoUrl) {
                if (node.image_versions2?.candidates?.[0]?.url) {
                    thumbnail = node.image_versions2.candidates[0].url;
                }
                return {
                    mediaType: 'VIDEO',
                    title,
                    author,
                    thumbnail,
                    duration: node.video_duration || 0,
                    formats: [
                        {
                            format_id: 'mp4_best',
                            url: videoUrl,
                            ext: 'mp4',
                            vcodec: 'h264',
                            acodec: 'aac',
                            format_note: 'MP4'
                        }
                    ],
                    source: 'Instagram'
                };
            }
        }

        // 2. CAROUSEL
        if (Array.isArray(node.carousel_media) && node.carousel_media.length > 0) {
            const images: any[] = [];
            for (let i = 0; i < node.carousel_media.length; i++) {
                const item = node.carousel_media[i];
                const cand = item.image_versions2?.candidates?.[0];
                if (cand && cand.url) {
                    const imgUrl = cand.url;
                    images.push({
                        id: `polaris_carousel_${item.id || i}`,
                        url: imgUrl,
                        downloadUrl: imgUrl,
                        format: 'jpg',
                        filename: `instagram_carousel_${item.id || i}.jpg`,
                        width: cand.width || 0,
                        height: cand.height || 0
                    });
                }
            }

            if (images.length > 0) {
                thumbnail = images[0].url || thumbnail;
                return {
                    mediaType: 'GALLERY',
                    title,
                    author,
                    thumbnail,
                    images,
                    duration: 0,
                    source: 'Instagram'
                };
            }
        }

        // 3. SINGLE IMAGE
        if (node.image_versions2?.candidates?.[0]?.url) {
            const cand = node.image_versions2.candidates[0];
            const imgUrl = cand.url;
            thumbnail = imgUrl;
            return {
                mediaType: 'IMAGE',
                title,
                author,
                thumbnail,
                images: [
                    {
                        id: `polaris_img_${node.id || Date.now()}`,
                        url: imgUrl,
                        downloadUrl: imgUrl,
                        format: 'jpg',
                        filename: `instagram_image_${node.id || Date.now()}.jpg`,
                        width: cand.width || 0,
                        height: cand.height || 0
                    }
                ],
                duration: 0,
                source: 'Instagram'
            };
        }

        return null;
    }
}
