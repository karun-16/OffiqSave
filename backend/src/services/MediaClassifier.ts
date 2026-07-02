import { ClassifierResult, MediaType } from './types';

export class MediaClassifier {
    static classify(url: string): ClassifierResult {
        const lowerUrl = url.toLowerCase();
        
        // Generic Direct Media
        if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?.*)?$/)) {
            return { platform: 'Generic', urlType: 'direct_image', expectedMedia: 'IMAGE' };
        }
        if (lowerUrl.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/)) {
            return { platform: 'Generic', urlType: 'direct_video', expectedMedia: 'VIDEO' };
        }

        // Instagram
        if (lowerUrl.includes('instagram.com')) {
            if (lowerUrl.includes('/reel/')) return { platform: 'Instagram', urlType: '/reel/', expectedMedia: 'VIDEO' };
            if (lowerUrl.includes('/tv/')) return { platform: 'Instagram', urlType: '/tv/', expectedMedia: 'VIDEO' };
            if (lowerUrl.includes('/stories/')) return { platform: 'Instagram', urlType: '/stories/', expectedMedia: 'VIDEO' };
            if (lowerUrl.includes('/p/')) return { platform: 'Instagram', urlType: '/p/', expectedMedia: 'UNKNOWN' };
            return { platform: 'Instagram', urlType: 'unknown', expectedMedia: 'UNKNOWN' };
        }

        // Facebook
        if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
            if (lowerUrl.includes('/video') || lowerUrl.includes('/watch') || lowerUrl.includes('fb.watch') || lowerUrl.includes('/reel/')) {
                return { platform: 'Facebook', urlType: 'video', expectedMedia: 'VIDEO' };
            }
            if (lowerUrl.includes('/photo')) return { platform: 'Facebook', urlType: 'photo', expectedMedia: 'IMAGE' };
            if (lowerUrl.includes('/media/set') || lowerUrl.includes('/albums/')) return { platform: 'Facebook', urlType: 'album', expectedMedia: 'GALLERY' };
            return { platform: 'Facebook', urlType: 'unknown', expectedMedia: 'UNKNOWN' };
        }

        // Twitter / X
        if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
            return { platform: 'Twitter', urlType: 'tweet', expectedMedia: 'UNKNOWN' };
        }

        // Reddit
        if (lowerUrl.includes('reddit.com') || lowerUrl.includes('redd.it')) {
            return { platform: 'Reddit', urlType: 'post', expectedMedia: 'UNKNOWN' };
        }

        // Pinterest
        if (lowerUrl.includes('pinterest.com') || lowerUrl.includes('pin.it')) {
            return { platform: 'Pinterest', urlType: 'pin', expectedMedia: 'UNKNOWN' };
        }

        return { platform: 'Generic', urlType: 'unknown', expectedMedia: 'UNKNOWN' };
    }
}
