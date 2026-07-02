import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { ExtractionResult } from '../types';
import { getHeadersForUrl } from './utils';

const DEBUG_DIR = path.join(process.cwd(), 'debug');
if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

function saveDebugHtml(html: string) {
    fs.writeFileSync(path.join(DEBUG_DIR, 'instagram.html'), html);
}

function saveDebugJson(jsonStr: string) {
    fs.writeFileSync(path.join(DEBUG_DIR, 'instagram.json'), jsonStr);
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
        const startTime = performance.now();
        
        let result = await this.attemptExtract(url, false, startTime);
        
        if (result.mediaType === 'UNKNOWN') {
            result = await this.attemptExtract(url, true, startTime);
        }
        
        if (result.mediaType === 'UNKNOWN') {
            throw new Error(`Unable to extract Instagram media. It may be private or require authentication.`);
        }
        
        return result;
    }

    private static getBestImage(candidates: any[]): { url: string; width: number; height: number } | null {
        if (!candidates || !Array.isArray(candidates) || candidates.length === 0) return null;
        let best = candidates[0];
        let maxArea = (best.width || 0) * (best.height || 0);
        for (const c of candidates) {
            const area = (c.width || 0) * (c.height || 0);
            if (area > maxArea) {
                maxArea = area;
                best = c;
            }
        }
        return { url: best.url, width: best.width || 0, height: best.height || 0 };
    }

    private static parseImageNode(node: any, index: number, metadataSource: string): any {
        let bestUrl = '';
        let width = 0;
        let height = 0;

        // check standard candidates
        if (node.image_versions2 && node.image_versions2.candidates) {
            const best = this.getBestImage(node.image_versions2.candidates);
            if (best) { bestUrl = best.url; width = best.width; height = best.height; }
        } else if (node.display_resources) {
            const best = this.getBestImage(node.display_resources.map((r: any) => ({ url: r.src, width: r.config_width, height: r.config_height })));
            if (best) { bestUrl = best.url; width = best.width; height = best.height; }
        } else if (node.display_url) {
            bestUrl = node.display_url;
            width = node.dimensions?.width || 0;
            height = node.dimensions?.height || 0;
        }

        if (bestUrl) {
            return {
                id: node.id || `ig-${index}`,
                url: bestUrl,
                downloadUrl: bestUrl,
                filename: `instagram_${node.id || index}.jpg`,
                format: 'jpg',
                width,
                height,
                source: metadataSource
            };
        }
        return null;
    }

    private static async attemptExtract(url: string, useCookies: boolean, overallStart: number): Promise<ExtractionResult> {
        let html = '';
        
        try {
            const headers = useCookies ? getHeadersForUrl(url) : {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            };
            
            // Allow bypassing actual fetch in tests if global.fetch is mocked to just return strings
            const response = await fetch(url, { headers, redirect: 'follow' });
            html = await response.text();
            
            if (html.length > 50) saveDebugHtml(html);

            if (!response.ok) {
                return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Instagram' };
            }

            const $ = cheerio.load(html);

            let isVideo = false;
            let images: Array<any> = [];
            let metadataSource = '';

            let title = $('meta[property="og:title"]').attr('content') || 'Instagram Post';
            let ogImage = $('meta[property="og:image"]').attr('content') || '';
            let ogVideo = $('meta[property="og:video"]').attr('content') || '';

            // 1. Embedded JSON (Regex match for anything that looks like xdt_shortcode_media)
            if (images.length === 0 && !isVideo) {
                const embeddedMatch = html.match(/"(?:xdt_)?shortcode_media"\s*:\s*(\{.*)/s);
                if (embeddedMatch) {
                    try {
                        let partial = embeddedMatch[1];
                        
                        // we don't need to parse it cleanly, just check for substrings and edges
                        if (partial.includes('"is_video":true') || partial.includes('"video_url"')) {
                            isVideo = true;
                            metadataSource = 'Embedded JSON';
                        }
                        
                        // Find the edges array robustly
                        let edgesStr = '';
                        const edgesIndex = partial.indexOf('"edges":');
                        if (edgesIndex > -1) {
                            const arrayStart = partial.indexOf('[', edgesIndex);
                            if (arrayStart > -1) {
                                let depth = 0;
                                for (let j = arrayStart; j < partial.length; j++) {
                                    if (partial[j] === '[') depth++;
                                    else if (partial[j] === ']') {
                                        depth--;
                                        if (depth === 0) {
                                            edgesStr = partial.substring(arrayStart, j + 1);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (edgesStr) {
                            try {
                                const edges = JSON.parse(edgesStr);
                                for (let i = 0; i < edges.length; i++) {
                                    const node = edges[i]?.node;
                                    if (node?.is_video || node?.video_url) isVideo = true;
                                    const img = this.parseImageNode(node, i, 'Embedded JSON');
                                    if (img) images.push(img);
                                }
                                if (images.length > 0) metadataSource = 'Embedded JSON';
                            } catch(e) { saveDebugJson(edgesStr); }
                        } else {
                            // Single media
                            try {
                                const drMatch = partial.match(/"display_resources"\s*:\s*(\[.*?\])/s);
                                if (drMatch) {
                                    const dr = JSON.parse(drMatch[1]);
                                    const best = this.getBestImage(dr.map((r: any) => ({ url: r.src, width: r.config_width, height: r.config_height })));
                                    if (best) {
                                        images.push({ id: 'ig-1', url: best.url, downloadUrl: best.url, format: 'jpg', width: best.width, height: best.height, filename: 'instagram_1.jpg' });
                                        metadataSource = 'Embedded JSON';
                                    }
                                }
                            } catch (e) {}
                        }
                    } catch (_) {}
                }
            }

            // 2. __NEXT_DATA__
            if (images.length === 0 && !isVideo) {
                const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
                if (nextDataMatch) {
                    try {
                        const nextData = JSON.parse(nextDataMatch[1]);
                        const items = nextData?.props?.pageProps?.routeProps?.items || [];
                        if (items.length > 0) {
                            const item = items[0];
                            if (item.video_versions || item.is_video) {
                                isVideo = true;
                                metadataSource = '__NEXT_DATA__';
                            }
                            if (item.carousel_media) {
                                for (let i = 0; i < item.carousel_media.length; i++) {
                                    const media = item.carousel_media[i];
                                    if (media.video_versions) isVideo = true;
                                    const img = this.parseImageNode(media, i, '__NEXT_DATA__');
                                    if (img) images.push(img);
                                }
                                if (images.length > 0) metadataSource = '__NEXT_DATA__';
                            } else {
                                const img = this.parseImageNode(item, 0, '__NEXT_DATA__');
                                if (img) { images.push(img); metadataSource = '__NEXT_DATA__'; }
                            }
                        }
                    } catch (e) {
                        saveDebugJson(nextDataMatch[1]);
                    }
                }
            }

            // 3. application/ld+json
            if (images.length === 0 && !isVideo) {
                $('script[type="application/ld+json"]').each((_, el) => {
                    try {
                        const data = JSON.parse($(el).html() || '{}');
                        const items = Array.isArray(data) ? data : [data];
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i];
                            if (item['@type'] === 'VideoObject') {
                                isVideo = true;
                                metadataSource = 'application/ld+json';
                            } else if (item['@type'] === 'ImageObject' || item['@type'] === 'ImageGallery') {
                                if (item.image) {
                                    let imgList = Array.isArray(item.image) ? item.image : [item.image];
                                    for (let j = 0; j < imgList.length; j++) {
                                        images.push({
                                            id: `ig-ld-${j}`, url: imgList[j], downloadUrl: imgList[j],
                                            format: 'jpg', filename: `instagram_ld_${j}.jpg`
                                        });
                                    }
                                    metadataSource = 'application/ld+json';
                                }
                            }
                        }
                    } catch (e) { saveDebugJson($(el).html() || ''); }
                });
            }

            // 4. window._sharedData
            if (images.length === 0 && !isVideo) {
                const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});<\/script>/s);
                if (sharedDataMatch) {
                    try {
                        const sd = JSON.parse(sharedDataMatch[1]);
                        const edges = sd?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media?.edge_sidecar_to_children?.edges;
                        if (edges) {
                            for (let i = 0; i < edges.length; i++) {
                                const node = edges[i]?.node;
                                if (node?.is_video) isVideo = true;
                                const img = this.parseImageNode(node, i, 'window._sharedData');
                                if (img) images.push(img);
                            }
                            if (images.length > 0) metadataSource = 'window._sharedData';
                        } else {
                            const media = sd?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                            if (media) {
                                if (media.is_video) isVideo = true;
                                const img = this.parseImageNode(media, 0, 'window._sharedData');
                                if (img) { images.push(img); metadataSource = 'window._sharedData'; }
                            }
                        }
                    } catch (e) { saveDebugJson(sharedDataMatch[1]); }
                }
            }

            // 5. additionalDataLoaded
            if (images.length === 0 && !isVideo) {
                const addDataMatch = html.match(/window\.__additionalDataLoaded\([^,]+,\s*({.*?})\);/s);
                if (addDataMatch) {
                    try {
                        const data = JSON.parse(addDataMatch[1]);
                        const media = data?.graphql?.shortcode_media;
                        if (media) {
                            if (media.is_video) isVideo = true;
                            if (media.edge_sidecar_to_children?.edges) {
                                const edges = media.edge_sidecar_to_children.edges;
                                for (let i = 0; i < edges.length; i++) {
                                    const img = this.parseImageNode(edges[i].node, i, 'additionalDataLoaded');
                                    if (img) images.push(img);
                                }
                                if (images.length > 0) metadataSource = 'additionalDataLoaded';
                            } else {
                                const img = this.parseImageNode(media, 0, 'additionalDataLoaded');
                                if (img) { images.push(img); metadataSource = 'additionalDataLoaded'; }
                            }
                        }
                    } catch (e) { saveDebugJson(addDataMatch[1]); }
                }
            }

            // 6. OpenGraph
            if (images.length === 0 && !isVideo) {
                const ogType = $('meta[property="og:type"]').attr('content') || '';
                if (ogType === 'video' || ogVideo) {
                    isVideo = true;
                    metadataSource = 'OpenGraph';
                } else if (ogImage) {
                    images.push({
                        id: 'ig-og', url: ogImage, downloadUrl: ogImage,
                        format: 'jpg', filename: 'instagram_og.jpg', width: 0, height: 0
                    });
                    metadataSource = 'OpenGraph';
                }
            }

            // Final logging format exactly as requested by user
            let resultType: 'IMAGE' | 'VIDEO' | 'GALLERY' | 'UNKNOWN' = 'UNKNOWN';
            
            if (isVideo) {
                resultType = 'VIDEO';
            } else if (images.length > 1) {
                resultType = 'GALLERY';
            } else if (images.length === 1) {
                resultType = 'IMAGE';
            }

            if (resultType !== 'UNKNOWN') {
                const highestRes = images.length > 0 
                    ? images.reduce((max, img) => ((img.width * img.height) > (max.width * max.height) ? img : max), images[0])
                    : null;
                const resStr = highestRes && highestRes.width && highestRes.height ? `${highestRes.width}x${highestRes.height}` : 'Unknown';

                console.log(`\nPlatform: Instagram`);
                console.log(`Media Type: ${resultType.charAt(0).toUpperCase() + resultType.slice(1).toLowerCase()}`);
                console.log(`Source Used: ${metadataSource}`);
                console.log(`Number of Images: ${images.length}`);
                console.log(`Highest Resolution: ${resStr}`);
                console.log(`Download URLs Generated: ${images.length}`);
                console.log(`Execution Time: ${Math.round(performance.now() - overallStart)}ms`);
                console.log(`Result: SUCCESS\n`);

                return {
                    mediaType: resultType,
                    title,
                    author: '',
                    thumbnail: images.length > 0 ? images[0].url : ogImage,
                    images: images.length > 0 ? images : undefined,
                    duration: 0,
                    source: 'Instagram'
                };
            }

            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Instagram' };

        } catch (err: any) {
            return { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: 'Instagram' };
        }
    }
}
