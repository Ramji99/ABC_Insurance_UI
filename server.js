const http = require('http');
const fs = require('fs');
const path = require('path');
http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  let p = path.join(process.cwd(), u.replace(/^\//, ''));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf: ' + p); return; }
    const ext = path.extname(p);
    const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'};
    res.writeHead(200, {'Content-Type': types[ext] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8793, () => console.log('listening'));
