const urls = {
  YouTube: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  Generic: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  Vimeo: 'https://vimeo.com/76979871',
  TikTok: 'https://www.tiktok.com/@tiktok/video/7106594312292453678',
  Twitter: 'https://x.com/SpaceX/status/1780447190369202521',
  Instagram: 'https://www.instagram.com/reel/C8q_wP1vQkG/',
  Reddit: 'https://www.reddit.com/r/videos/comments/1f81d11/big_buck_bunny_60fps_4k/'
};

async function testAll() {
  for (const [platform, url] of Object.entries(urls)) {
    console.log(`\nTesting ${platform}...`);
    try {
      const res = await fetch('http://localhost:4000/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const info = await res.json();
      if (!res.ok) throw new Error(info.error || 'Request failed');
      
      console.log(`✅ [${platform}] Success!`);
      console.log(`Title: ${info.title.substring(0, 50)}...`);
    } catch (e) {
      console.log(`❌ [${platform}] Failed!`);
      console.log(`Error: ${e.message}`);
    }
  }
}

testAll();
