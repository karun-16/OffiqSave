const { pipeline } = require('stream/promises');

async function testInsta() {
    try {
        const url = 'https://www.instagram.com/reel/C7_4PXZh18x/';
        console.log('Testing Instagram Info endpoint...');
        const res = await fetch('http://localhost:4000/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${data}`);
    } catch (e) {
        console.error(e);
    }
}

testInsta();
