const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
async function test() {
  try {
    const stream = ytdl('https://www.youtube.com/shorts/xdNl2D5yhdE', { filter: 'audioonly' });
    stream.pipe(fs.createWriteStream('test_ytdl.mp3'));
    stream.on('end', () => console.log('Download complete'));
    stream.on('error', (err) => console.log('Error:', err.message));
  } catch (e) {
    console.error(e);
  }
}
test();
