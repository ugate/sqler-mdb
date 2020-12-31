'use strict';

const http = require('http');
const Fs = require('fs');
const Path = require('path');

const hostname = '127.0.0.1';
const port = process.env.SQLER_DOCS_PORT;

const server = http.createServer((req, res) => {
  const dir = Path.resolve(__dirname, '../');
  const url = req.url === '/' ? '/index.html' : req.url.replace(/\./g, '');
  const file = `${dir}/docs${url}`;

  console.log(`Serving docs request: ${req.url} from: ${file}`);

  Fs.readFile(file, (err, data) => {
    if (err) {
      console.error(`Failed to find docs file: ${file}`, err);
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(port, hostname, () => {
  console.log(`Serving docs at http://${hostname}:${port}/`);
});