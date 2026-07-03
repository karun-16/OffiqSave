import { InstagramExtractor } from './src/services/extractors/InstagramExtractor';

async function run() {
    try {
        const url = 'https://www.instagram.com/p/CtX2Y0zJG3-/';
        const result = await InstagramExtractor.extract(url);
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
