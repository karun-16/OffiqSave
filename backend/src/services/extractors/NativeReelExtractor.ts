import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

export interface VideoCandidate {
    url: string;
    width?: number;
    height?: number;
    source: string;
    jsonPath?: string;
    codec?: string;
}

export class NativeReelExtractor {
    static extractVideoFromHtmlOrJson(htmlOrObj: any, sourceName: string): { title: string; author: string; thumbnail: string; duration: number; videos: VideoCandidate[] } | null {
        let title = '';
        let author = '';
        let thumbnail = '';
        let duration = 0;
        const videos: VideoCandidate[] = [];
        const visited = new Set();

        function walk(node: any, currentPath: string = '$') {
            if (!node) return;

            if (typeof node === 'string') {
                if (node.includes('video_versions') || node.includes('video_url') || node.includes('progressive_download_url') || node.includes('video_resources')) {
                    try {
                        const parsed = JSON.parse(node);
                        walk(parsed, `${currentPath}[parsed_string]`);
                    } catch(e) {}
                }
                return;
            }

            if (typeof node !== 'object') return;
            if (visited.has(node)) return;
            visited.add(node);

            if (Array.isArray(node)) {
                node.forEach((item, i) => walk(item, `${currentPath}[${i}]`));
                return;
            }

            // Extract metadata if available
            if (!title && (node.title || node.caption?.text || node.accessibility_caption)) {
                title = node.title || node.caption?.text || node.accessibility_caption || '';
            }
            if (!author && (node.owner?.username || node.user?.username || node.author?.username)) {
                author = node.owner?.username || node.user?.username || node.author?.username || '';
            }
            if (!thumbnail && (node.display_url || node.display_src || node.thumbnail_src)) {
                thumbnail = node.display_url || node.display_src || node.thumbnail_src || '';
            }
            if (!duration && (node.video_duration || node.duration)) {
                duration = Number(node.video_duration || node.duration) || 0;
            }

            // 1. video_versions
            if (node.video_versions && Array.isArray(node.video_versions)) {
                for (let i = 0; i < node.video_versions.length; i++) {
                    const v = node.video_versions[i];
                    if (v && (v.url || v.src)) {
                        const rawUrl = (v.url || v.src).replace(/\\u0026/g, '&').replace(/\\/g, '');
                        videos.push({
                            url: rawUrl,
                            width: v.width || 0,
                            height: v.height || 0,
                            source: `${sourceName} (video_versions)`,
                            jsonPath: `${currentPath}.video_versions[${i}]`,
                            codec: 'h264/mp4'
                        });
                    }
                }
            }

            // 2. video_resources
            if (node.video_resources && Array.isArray(node.video_resources)) {
                for (let i = 0; i < node.video_resources.length; i++) {
                    const v = node.video_resources[i];
                    if (v && (v.src || v.url)) {
                        const rawUrl = (v.src || v.url).replace(/\\u0026/g, '&').replace(/\\/g, '');
                        videos.push({
                            url: rawUrl,
                            width: v.config_width || v.width || 0,
                            height: v.config_height || v.height || 0,
                            source: `${sourceName} (video_resources)`,
                            jsonPath: `${currentPath}.video_resources[${i}]`,
                            codec: 'h264/mp4'
                        });
                    }
                }
            }

            // 3. video_url
            if (node.video_url && typeof node.video_url === 'string') {
                const rawUrl = node.video_url.replace(/\\u0026/g, '&').replace(/\\/g, '');
                videos.push({
                    url: rawUrl,
                    width: node.dimensions?.width || 0,
                    height: node.dimensions?.height || 0,
                    source: `${sourceName} (video_url)`,
                    jsonPath: `${currentPath}.video_url`,
                    codec: 'h264/mp4'
                });
            }

            // 4. progressive_download_url
            if (node.progressive_download_url && typeof node.progressive_download_url === 'string') {
                const rawUrl = node.progressive_download_url.replace(/\\u0026/g, '&').replace(/\\/g, '');
                videos.push({
                    url: rawUrl,
                    source: `${sourceName} (progressive_download_url)`,
                    jsonPath: `${currentPath}.progressive_download_url`,
                    codec: 'h264/mp4'
                });
            }

            // 5. playback_url
            if (node.playback_url && typeof node.playback_url === 'string') {
                const rawUrl = node.playback_url.replace(/\\u0026/g, '&').replace(/\\/g, '');
                videos.push({
                    url: rawUrl,
                    source: `${sourceName} (playback_url)`,
                    jsonPath: `${currentPath}.playback_url`,
                    codec: 'h264/mp4'
                });
            }

            // Recurse object keys
            for (const key of Object.keys(node)) {
                if (typeof node[key] === 'object' || typeof node[key] === 'string') {
                    walk(node[key], `${currentPath}.${key}`);
                }
            }
        }

        if (typeof htmlOrObj === 'string') {
            const $ = cheerio.load(htmlOrObj);

            if (!title) title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Instagram Reel';
            if (!thumbnail) thumbnail = $('meta[property="og:image"]').attr('content') || '';

            // Check OpenGraph video meta tag
            const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:secure_url"]').attr('content');
            if (ogVideo) {
                videos.push({
                    url: ogVideo,
                    source: `${sourceName} (OpenGraph og:video)`,
                    jsonPath: 'meta[property="og:video"]',
                    codec: 'h264/mp4'
                });
            }

            // Parse all script tags
            $('script').each((_, el) => {
                const content = $(el).html();
                if (!content) return;
                if (content.includes('video') || content.includes('xdt_shortcode_media') || content.includes('Polaris') || content.includes('ScheduledServerJS') || content.includes('Relay') || content.includes('__bbox') || content.includes('xig_polaris_media')) {
                    try {
                        const parsed = JSON.parse(content);
                        walk(parsed, 'script_json');
                    } catch(e) {
                        // Regex search for embedded JSON objects inside scripts
                        const matches = content.match(/(\{[\s\S]*?\})/g);
                        if (matches) {
                            for (const m of matches) {
                                if (m.includes('video_url') || m.includes('video_versions') || m.includes('video_resources')) {
                                    try {
                                        const parsed = JSON.parse(m);
                                        walk(parsed, 'script_regex');
                                    } catch(err) {}
                                }
                            }
                        }
                    }
                }
            });
        } else {
            walk(htmlOrObj, 'root');
        }

        if (videos.length === 0) return null;

        // Deduplicate videos by URL
        const uniqueVideos: VideoCandidate[] = [];
        const seen = new Set<string>();
        for (const v of videos) {
            if (v.url && !seen.has(v.url) && !v.url.includes('logging_page_id')) {
                seen.add(v.url);
                uniqueVideos.push(v);
            }
        }

        // Sort by resolution area descending
        uniqueVideos.sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));

        return {
            title: title || 'Instagram Reel',
            author: author || '',
            thumbnail: thumbnail || (uniqueVideos.length > 0 ? uniqueVideos[0].url : ''),
            duration: duration || 0,
            videos: uniqueVideos
        };
    }
}
