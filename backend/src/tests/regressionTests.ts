import { PlatformClassifier } from '../classifier/PlatformClassifier';
import { PlatformRouter } from '../router/PlatformRouter';
import { ExtractorRegistry } from '../extractors/ExtractorRegistry';
import { ExtractorError } from '../common/errors';

export async function runRegressionTests() {
  console.log('==================================================');
  console.log('STARTING OFFIQSAVE MODULAR FRAMEWORK REGRESSION TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // TEST SUITE 1: Classifier Tests (All Priority 1 & 2 & 3 Domains)
  console.log('--- TEST SUITE 1: Platform Classifier ---');
  const classificationCases = [
    { url: 'https://www.instagram.com/reel/C8q_wP1vQkG/', expected: 'Instagram' },
    { url: 'https://x.com/SpaceX/status/1780447190369202521', expected: 'Twitter' },
    { url: 'https://twitter.com/NASA/status/123456789', expected: 'Twitter' },
    { url: 'https://www.facebook.com/watch/?v=123456789', expected: 'Facebook' },
    { url: 'https://fb.watch/xyz123/', expected: 'Facebook' },
    { url: 'https://www.pinterest.com/pin/1234567890/', expected: 'Pinterest' },
    { url: 'https://pin.it/abc1234', expected: 'Pinterest' },
    { url: 'https://www.tiktok.com/@tiktok/video/7106594312292453678', expected: 'TikTok' },
    { url: 'https://vt.tiktok.com/ZS12345/', expected: 'TikTok' },
    { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', expected: 'YouTube' },
    { url: 'https://youtu.be/aqz-KE-bpKQ', expected: 'YouTube' },
    { url: 'https://www.threads.net/@user/post/123456', expected: 'Threads' },
    { url: 'https://www.reddit.com/r/videos/comments/1f81d11/test/', expected: 'Reddit' },
    { url: 'https://redd.it/1f81d11', expected: 'Reddit' },
    { url: 'https://www.linkedin.com/posts/activity-123456', expected: 'LinkedIn' },
    { url: 'https://vimeo.com/76979871', expected: 'Vimeo' },
    { url: 'https://www.dailymotion.com/video/x8xyz12', expected: 'Dailymotion' },
    { url: 'https://soundcloud.com/artist/track', expected: 'SoundCloud' },
    { url: 'https://t.me/channel/123', expected: 'Telegram' }
  ];

  for (const c of classificationCases) {
    const result = PlatformClassifier.classify(c.url);
    assert(result === c.expected, `Classify ${c.url} -> Expected: ${c.expected}, Got: ${result}`);
  }

  // TEST SUITE 2: Extractor Interface & Common Response Objects
  console.log('\n--- TEST SUITE 2: Extractor Interface & Response Object Compliance ---');
  const extractors = ExtractorRegistry.getRegisteredExtractors();
  assert(extractors.length >= 11, `Registry count >= 11 (Found: ${extractors.length})`);

  for (const ext of extractors) {
    assert(typeof ext.platform() === 'string' && ext.platform().length > 0, `Extractor platform() valid for ${ext.constructor.name}`);
  }

  // TEST SUITE 3: Invalid URL & Error Code Tests
  console.log('\n--- TEST SUITE 3: Error Handling & Invalid URLs ---');
  try {
    const badUrl = 'https://invalid-non-existent-domain-offiqsave-123456.com/post';
    const info = await PlatformRouter.route(badUrl);
    assert(false, 'Should throw error on invalid non-existent URL');
  } catch (err: any) {
    assert(true, `Invalid URL throws error as expected (${err.message})`);
  }

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    throw new Error(`${failed} regression test(s) failed.`);
  }
}

if (require.main === module) {
  runRegressionTests().catch((err) => {
    console.error('Regression tests execution failed:', err);
    process.exit(1);
  });
}
