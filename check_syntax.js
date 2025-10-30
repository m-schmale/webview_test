const fs = require('fs');
const vm = require('vm');
function checkFile(path) {
  try {
    const src = fs.readFileSync(path, 'utf8');
  new vm.Script(src, { filename: path });
    console.log(path + ': OK');
  } catch (e) {
    console.error(path + ': ERR -> ' + (e && e.message ? e.message : e));
  }
}
// Check service worker file
checkFile('sw.js');
// Extract inline script from index.html and check
try {
  const html = fs.readFileSync('index.html', 'utf8');
  const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!m) {
    console.error('index.html: no inline <script> found');
  } else {
    const script = m[1];
    try {
  new vm.Script(script, { filename: 'index.html:inline-script' });
      console.log('index.html inline script: OK');
    } catch (e) {
      console.error('index.html inline script: ERR -> ' + (e && e.message ? e.message : e));
    }
  }
} catch (e) {
  console.error('index.html: read error -> ' + (e && e.message ? e.message : e));
}
