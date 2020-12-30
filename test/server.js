'use strict';

const http = require('http');
const fs = require('fs');

const hostname = '127.0.0.1';
const port = 9099;

const server = http.createServer((req, res) => {
  const file = `${__dirname}/docs${req.url}`;

  console.log(`Serving docs request: ${__dirname}/docs${req.url}`);

  fs.readFile(file, (err, data) => {
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
  console.log(`Docs server running at http://${hostname}:${port}/`);
});