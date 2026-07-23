import { MediaClassifier } from './MediaClassifier';
import { ExtractionResult } from './types';
import { InstagramExtractor } from './extractors/InstagramExtractor';
import { instagramReelExtractor } from '../extractors/instagram/InstagramReelExtractor';
import { FacebookExtractor } from './extractors/FacebookExtractor';
import { TwitterExtractor } from './extractors/TwitterExtractor';
import { RedditExtractor } from './extractors/RedditExtractor';
import { PinterestExtractor } from './extractors/PinterestExtractor';
import { GenericExtractor } from './extractors/GenericExtractor';
import { BaseHandler, pipelineLog } from './handlers/BaseHandler';

export class ExtractionRouter {
    static async route(url: string, handler: BaseHandler): Promise<ExtractionResult> {
        const startTime = performance.now();
        const classifierResult = MediaClassifier.classify(url);
        const lowerUrl = url.toLowerCase();

        let pathType: 'reel' | 'post' | 'tv' | 'unknown' = 'unknown';
        if (lowerUrl.includes('/reel/') || lowerUrl.includes('/reels/')) {
            pathType = 'reel';
        } else if (lowerUrl.includes('/tv/')) {
            pathType = 'tv';
        } else if (lowerUrl.includes('/p/')) {
            pathType = 'post';
        }

        if (classifierResult.platform === 'Instagram') {
            const selectedExtractor = (pathType === 'reel' || pathType === 'tv')
                ? 'InstagramReelExtractor'
                : 'InstagramExtractor';

            console.log(`[Router] URL: ${url}`);
            console.log(`[Router] Path Type: ${pathType}`);
            console.log(`[Router] Selected Extractor: ${selectedExtractor}`);

            if (pathType === 'reel' || pathType === 'tv') {
                console.log(`[Native Reel] Starting extraction`);
                try {
                    const reelResult = await instagramReelExtractor.extract(url);
                    console.log(`[Native Reel] Success`);

                    pipelineLog(
                        classifierResult.platform,
                        classifierResult.urlType,
                        classifierResult.expectedMedia,
                        'InstagramReelExtractor',
                        'YES',
                        'NO',
                        'HTTP',
                        Math.round(performance.now() - startTime),
                        'SUCCESS'
                    );

                    return {
                        mediaType: 'VIDEO',
                        title: reelResult.title || 'Instagram Reel',
                        author: reelResult.author || '',
                        thumbnail: reelResult.thumbnail || '',
                        duration: reelResult.duration || 0,
                        formats: [
                            {
                                format_id: 'mp4_best',
                                url: reelResult.videoUrl,
                                ext: 'mp4',
                                vcodec: 'h264',
                                acodec: 'aac',
                                format_note: 'MP4'
                            }
                        ],
                        source: 'InstagramReelExtractor'
                    };
                } catch (err: any) {
                    console.log(`[Native Reel] Failed`);
                    console.log(err.message || err);

                    pipelineLog(
                        classifierResult.platform,
                        classifierResult.urlType,
                        classifierResult.expectedMedia,
                        'InstagramReelExtractor',
                        'NO',
                        'YES (Fallback)',
                        'yt-dlp',
                        Math.round(performance.now() - startTime),
                        'SUCCESS (Routed to yt-dlp fallback)'
                    );
                    return await handler.extractWithYtDlp(url);
                }
            }
        }
        
        let nativeExtractor: any = null;
        switch (classifierResult.platform) {
            case 'Instagram': nativeExtractor = InstagramExtractor; break;
            case 'Facebook': nativeExtractor = FacebookExtractor; break;
            case 'Twitter': nativeExtractor = TwitterExtractor; break;
            case 'Reddit': nativeExtractor = RedditExtractor; break;
            case 'Pinterest': nativeExtractor = PinterestExtractor; break;
            case 'Generic': nativeExtractor = GenericExtractor; break;
        }

        // Direct video from classifier -> skip native, go straight to yt-dlp
        if (classifierResult.expectedMedia === 'VIDEO' && classifierResult.platform !== 'Instagram') {
            console.log(`[DEBUG] 2. MediaClassifier result: Platform=${classifierResult.platform}, ExpectedMedia=${classifierResult.expectedMedia}`);
            console.log(`[DEBUG] 3. Handler selected: ${handler.constructor.name}`);
            console.log(`[DEBUG] 4. Extractor called: Skipping native (Video detected), routing directly to yt-dlp`);
            
            pipelineLog(
                classifierResult.platform,
                classifierResult.urlType,
                classifierResult.expectedMedia,
                'None',
                'N/A',
                'YES',
                'yt-dlp',
                Math.round(performance.now() - startTime),
                'SUCCESS (Routed to yt-dlp)'
            );
            return await handler.extractWithYtDlp(url);
        }

        console.log(`[DEBUG] 2. MediaClassifier result: Platform=${classifierResult.platform}, ExpectedMedia=${classifierResult.expectedMedia}`);
        console.log(`[DEBUG] 3. Handler selected: ${handler.constructor.name}`);
        console.log(`[DEBUG] 4. Extractor called: ${nativeExtractor ? nativeExtractor.name : 'None'}`);

        // IMAGE, GALLERY, or UNKNOWN -> run native extractor
        let extractionResult: ExtractionResult = { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: '' };
        if (nativeExtractor) {
            try {
                console.log(`[DEBUG] 5. Native extractor start: ${nativeExtractor.name}.extract(${url})`);
                extractionResult = await nativeExtractor.extract(url);
                console.log(`[DEBUG] 6. Native extractor result: MediaType=${extractionResult.mediaType}`);
            } catch (e: any) {
                console.log(`[DEBUG] 6. Native extractor threw error: ${e.message}`);
            }
        }

        const nativeSuccess = extractionResult.mediaType !== 'UNKNOWN' ? 'YES' : 'NO';

        if (extractionResult.mediaType === 'IMAGE' || extractionResult.mediaType === 'GALLERY') {
            pipelineLog(
                classifierResult.platform,
                classifierResult.urlType,
                classifierResult.expectedMedia,
                nativeExtractor ? nativeExtractor.name : 'Unknown',
                nativeSuccess,
                'NO',
                extractionResult.mediaType === 'GALLERY' ? 'ZIP Stream' : 'HTTP',
                Math.round(performance.now() - startTime),
                'SUCCESS'
            );
            return extractionResult;
        }

        if (extractionResult.mediaType === 'VIDEO') {
            console.log(`[DEBUG] 7. Fallback to yt-dlp triggered. Why? Native extractor identified media as VIDEO. Handler: ${handler.constructor.name}`);
            pipelineLog(
                classifierResult.platform,
                classifierResult.urlType,
                classifierResult.expectedMedia,
                nativeExtractor ? nativeExtractor.name : 'Unknown',
                nativeSuccess,
                'YES',
                'yt-dlp',
                Math.round(performance.now() - startTime),
                'SUCCESS (Routed to yt-dlp)'
            );
            return await handler.extractWithYtDlp(url);
        }

        // UNKNOWN from native extractor
        if (classifierResult.platform === 'Instagram' || classifierResult.platform === 'Generic') {
            console.log(`[DEBUG] 7. Fallback to yt-dlp triggered. Why? Native extractor returned UNKNOWN. Handler: ${handler.constructor.name}`);
            pipelineLog(
                classifierResult.platform,
                classifierResult.urlType,
                classifierResult.expectedMedia,
                nativeExtractor ? nativeExtractor.name : 'Unknown',
                nativeSuccess,
                'YES (Fallback)',
                'yt-dlp',
                Math.round(performance.now() - startTime),
                'SUCCESS (Routed to yt-dlp fallback)'
            );
            return await handler.extractWithYtDlp(url);
        }

        pipelineLog(
            classifierResult.platform,
            classifierResult.urlType,
            classifierResult.expectedMedia,
            nativeExtractor ? nativeExtractor.name : 'Unknown',
            nativeSuccess,
            'NO',
            'None',
            Math.round(performance.now() - startTime),
            'FAILURE'
        );
        throw new Error("Unable to classify media. This media couldn't be accessed. It may require authentication or be private.");
    }
}
