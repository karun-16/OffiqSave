import { MediaClassifier } from './MediaClassifier';
import { ExtractionResult } from './types';
import { InstagramExtractor } from './extractors/InstagramExtractor';
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
        if (classifierResult.expectedMedia === 'VIDEO') {
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

        // IMAGE, GALLERY, or UNKNOWN -> run native extractor
        let extractionResult: ExtractionResult = { mediaType: 'UNKNOWN', title: '', author: '', thumbnail: '', duration: 0, source: '' };
        if (nativeExtractor) {
            try {
                extractionResult = await nativeExtractor.extract(url);
            } catch (e) {}
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
