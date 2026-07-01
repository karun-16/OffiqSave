const fs = require('fs');
const { pipeline } = require('stream/promises');

async function testE2E(url, platformName) {
  console.log(`\n===================`);
  console.log(`Testing E2E: ${platformName}`);
  console.log(`URL: ${url}`);
  
  try {
    console.log(`1. Fetching Metadata...`);
    const t0 = Date.now();
    const infoRes = await fetch('http://localhost:4000/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    console.log(`   Time: ${Date.now() - t0}ms`);
    
    if (!infoRes.ok) throw new Error(`HTTP ${infoRes.status}`);
    const info = await infoRes.json();
    
    console.log(`   Title: ${info.title}`);
    console.log(`   Thumbnail: ${info.thumbnail ? 'YES' : 'NO'}`);
    console.log(`   Duration: ${info.duration}s`);
    
    const videoFormats = info.formats.filter(f => f.vcodec !== 'none' && f.resolution !== 'audio only');
    if (videoFormats.length === 0) {
      console.log(`   ❌ No video formats found!`);
      return;
    }
    console.log(`   Available Video Formats: ${videoFormats.length}`);
    
    const bestFormat = videoFormats[videoFormats.length - 1];
    console.log(`   Selected Quality: ${bestFormat.resolution} (${bestFormat.format_id})`);
    
    console.log(`2. Downloading Video...`);
    const dlT0 = Date.now();
    const dlRes = await fetch('http://localhost:4000/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, formatId: bestFormat.format_id })
    });
    
    await pipeline(dlRes.body, fs.createWriteStream(`${platformName}_test.mp4`));
    console.log(`   ✅ Video Download Complete! (${Date.now() - dlT0}ms)`);
    const stat = fs.statSync(`${platformName}_test.mp4`);
    console.log(`   File Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
    
    console.log(`3. Audio Extraction (Convert)...`);
    const audioT0 = Date.now();
    const audioRes = await fetch('http://localhost:4000/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, formatId: bestFormat.format_id, targetFormat: 'mp3' })
    });
    
    if (!audioRes.ok) {
        const errText = await audioRes.text();
        throw new Error(`Audio HTTP ${audioRes.status}: ${errText}`);
    }
    
    await pipeline(audioRes.body, fs.createWriteStream(`${platformName}_test.mp3`));
    console.log(`   ✅ Audio Extraction Complete! (${Date.now() - audioT0}ms)`);
    const aStat = fs.statSync(`${platformName}_test.mp3`);
    console.log(`   File Size: ${(aStat.size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
}

async function runAll() {
  await testE2E('https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'YouTube');
  await testE2E('https://vimeo.com/76979871', 'Vimeo');
  await testE2E('https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4', 'Generic');
}

runAll();
