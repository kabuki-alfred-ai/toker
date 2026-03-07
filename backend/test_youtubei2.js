const fs = require('fs');
const { Innertube, UniversalCache } = require('youtubei.js');

async function test() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(true, './yt_cache'),
      generate_session_locally: true,
      clientType: 'ANDROID'
    });
    
    console.log('Fetching stream for xdNl2D5yhdE via ANDROID client...');

    const stream = await yt.download('xdNl2D5yhdE', {
      type: 'audio',
      client: 'ANDROID',
      quality: 'best'
    });

    const file = fs.createWriteStream('test_youtubei.mp4');
    for await (const chunk of stream) {
      file.write(chunk);
    }
    file.end();
    
    console.log('Download complete using youtubei.js (ANDROID)');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
