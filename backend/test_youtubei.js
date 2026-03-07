const fs = require('fs');
const { Innertube, UniversalCache } = require('youtubei.js');

async function test() {
  try {
    const yt = await Innertube.create({ 
      cache: new UniversalCache(true, './yt_cache'),
      generate_session_locally: true // Bypasses bot checks by generating PoTokens
    });
    
    console.log('Fetching info for xdNl2D5yhdE...');
    const info = await yt.getBasicInfo('xdNl2D5yhdE');
    console.log('Title:', info.basic_info.title);

    const stream = await yt.download('xdNl2D5yhdE', {
      type: 'audio', // audio, video or video+audio
      quality: 'best', // best, bestefficiency, 144p, 240p, 480p, 720p and so on.
      format: 'mp4' // media container format 
    });

    const file = fs.createWriteStream('test_youtubei.mp4');
    
    // The stream is a ReadableStream (Web API), we need to read it into a Node.js stream
    for await (const chunk of stream) {
      file.write(chunk);
    }
    file.end();
    
    console.log('Download complete using youtubei.js');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
