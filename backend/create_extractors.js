const fs = require('fs');
const path = require('path');

const extractorsDir = path.join(__dirname, 'src', 'services', 'extractors');
if (!fs.existsSync(extractorsDir)) {
    fs.mkdirSync(extractorsDir, { recursive: true });
}

const content = `import * as cheerio from 'cheerio';
import { MediaInfo } from '../downloaderService';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

export async function extractRedditNative(url: string): Promise<MediaInfo | null> {
    try {
        const jsonUrl = url.split('?')[0].replace(/\/$/, '') + '.json';
        const response = await fetch(jsonUrl, { headers });
        if (!response.ok) return null;
        
        const data = await response.json();
        const post = data[0]?.data?.children[0]?.data;
        if (!post) return null;

        const title = post.title || 'Reddit Post';
        const uploader = post.author;
        const uploader_url = \`https://reddit.com/user/\${uploader}\`;
        
        // Check for gallery
        if (post.is_gallery && post.gallery_data && post.media_metadata) {
            const items = post.gallery_data.items;
            const images = items.map((item: any, idx: number) => {
                const media = post.media_metadata[item.media_id];
                const imgUrl = media.s.u.replace(/&amp;/g, '&');
                return {
                    id: item.media_id,
                    url: imgUrl,
                    width: media.s.x,
                    height: media.s.y,
                    format: imgUrl.split('.').pop()?.split('?')[0] || 'jpg'
                };
            });
            
            return {
                title,
                thumbnail: images[0]?.url || '',
                duration: 0,
                platform: 'Reddit',
                uploader,
                uploader_url,
                formats: [],
                mediaType: 'gallery',
                images
            };
        }
        
        // Check for single image
        if (post.post_hint === 'image' && post.url) {
            return {
                title,
                thumbnail: post.url,
                duration: 0,
                platform: 'Reddit',
                uploader,
                uploader_url,
                formats: [],
                mediaType: 'image',
                images: [{
                    id: 'img1',
                    url: post.url,
                    format: post.url.split('.').pop()?.split('?')[0] || 'jpg'
                }]
            };
        }
        
        // Video check
        if (post.is_video && post.secure_media?.reddit_video) {
            // We can let yt-dlp handle Reddit videos as it does it well, 
            // or we could extract it here. But the requirement says: "Reddit: Native JSON/OpenGraph first, yt-dlp fallback".
            // Since yt-dlp handles DASH/HLS audio merging for Reddit better, we can return null to fallback to yt-dlp for video.
            return null;
        }

        return null;
    } catch (e) {
        return null;
    }
}

export async function extractPinterestNative(url: string): Promise<MediaInfo | null> {
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) return null;
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const ogType = $('meta[property="og:type"]').attr('content');
        if (ogType === 'video') return null; // fallback to yt-dlp for video

        const ogImage = $('meta[property="og:image"]').attr('content');
        const title = $('meta[property="og:title"]').attr('content') || 'Pinterest Pin';
        
        if (ogImage) {
            return {
                title,
                thumbnail: ogImage,
                duration: 0,
                platform: 'Pinterest',
                formats: [],
                mediaType: 'image',
                images: [{
                    id: 'pin',
                    url: ogImage,
                    format: 'jpg'
                }]
            };
        }
        
        return null;
    } catch (e) {
        return null;
    }
}

export async function extractInstagramNative(url: string): Promise<MediaInfo | null> {
    // If it's explicitly a reel or tv, don't waste time natively, go to yt-dlp
    if (url.includes('/reel/') || url.includes('/tv/')) {
        return null; 
    }
    
    // For /p/ (posts) or stories, try OpenGraph to see if it's a single image
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) return null;
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const ogType = $('meta[property="og:type"]').attr('content');
        if (ogType === 'video') return null; // Fallback to yt-dlp
        
        const ogImage = $('meta[property="og:image"]').attr('content');
        const title = $('meta[property="og:title"]').attr('content') || 'Instagram Post';
        
        // Unfortunately, OpenGraph usually only gives the first image of a carousel.
        // True carousel extraction requires parsing the sharedData JSON, which often fails without auth.
        // We will return a single image if it exists. If it's a carousel, yt-dlp might fail too unless authenticated.
        if (ogImage && ogType !== 'video') {
            return {
                title,
                thumbnail: ogImage,
                duration: 0,
                platform: 'Instagram',
                formats: [],
                mediaType: 'image',
                images: [{
                    id: 'ig',
                    url: ogImage,
                    format: 'jpg'
                }]
            };
        }
        
        return null;
    } catch (e) {
        return null;
    }
}

export async function extractFacebookNative(url: string): Promise<MediaInfo | null> {
    if (url.includes('/video') || url.includes('/reel')) return null;
    
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) return null;
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const ogType = $('meta[property="og:type"]').attr('content');
        if (ogType && ogType.includes('video')) return null;
        
        const ogImage = $('meta[property="og:image"]').attr('content');
        const title = $('meta[property="og:title"]').attr('content') || 'Facebook Post';
        
        if (ogImage) {
            return {
                title,
                thumbnail: ogImage,
                duration: 0,
                platform: 'Facebook',
                formats: [],
                mediaType: 'image',
                images: [{
                    id: 'fb',
                    url: ogImage,
                    format: 'jpg'
                }]
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function extractGenericNative(url: string): Promise<MediaInfo | null> {
    const lowerUrl = url.toLowerCase();
    const isImage = lowerUrl.match(/\\.(jpeg|jpg|gif|png|webp|avif)($|\\?)/);
    const isVideo = lowerUrl.match(/\\.(mp4|mov|mkv|webm)($|\\?)/);
    const isAudio = lowerUrl.match(/\\.(mp3|aac|flac|wav|m4a)($|\\?)/);
    
    if (isImage) {
        return {
            title: url.split('/').pop()?.split('?')[0] || 'Image',
            thumbnail: url,
            duration: 0,
            platform: 'Generic',
            formats: [],
            mediaType: 'image',
            images: [{
                id: 'gen',
                url,
                format: isImage[1]
            }]
        };
    }
    
    if (isVideo) {
        // We can just return the raw video URL as the only format
        return {
            title: url.split('/').pop()?.split('?')[0] || 'Video',
            thumbnail: '', // Hard to get thumbnail natively without ffmpeg
            duration: 0,
            platform: 'Generic',
            mediaType: 'video',
            formats: [{
                format_id: 'best',
                url,
                ext: isVideo[1],
                resolution: 'Source',
                vcodec: 'unknown',
                acodec: 'unknown'
            }]
        };
    }
    
    if (isAudio) {
        return {
            title: url.split('/').pop()?.split('?')[0] || 'Audio',
            thumbnail: '',
            duration: 0,
            platform: 'Generic',
            mediaType: 'audio',
            formats: [{
                format_id: 'best',
                url,
                ext: isAudio[1],
                resolution: 'audio only',
                vcodec: 'none',
                acodec: 'unknown'
            }]
        };
    }
    
    return null;
}
`;

fs.writeFileSync(path.join(extractorsDir, 'NativeExtractors.ts'), content, 'utf8');
console.log('Created NativeExtractors.ts');
