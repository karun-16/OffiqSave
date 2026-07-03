import { InstagramExtractor } from '../services/extractors/InstagramExtractor';

async function run() {
    console.log("Testing Instagram Extractor against real URL...");
    try {
        const result = await InstagramExtractor.extract('https://www.instagram.com/p/DaQKxnwkWt5/');
        console.log("FINAL RESULT:");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Extraction error:", e);
    }
}

run();
