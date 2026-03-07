const fs = require('fs');
const play = require('play-dl');
async function test() {
  try {
    const stream = await play.stream('https://www.youtube.com/shorts/xdNl2D5yhdE');
    stream.stream.pipe(fs.createWriteStream('test.mp3'));
    console.log('Success, audio stream opened');
  } catch (e) {
    console.error(e);
  }
}
test();
