'use strict';

const Fs = require('fs');
const Stream = require('stream');
// node >= v16 :
// const { pipeline } = require('stream/promises');
// node < 16 :
const Util = require('util');
const pipeline = Util.promisify(Stream.pipeline);

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  const date = new Date();

  await pipeline(
    // readable should output the binds
    // here we're just using some static values for illustration purposes
    Stream.Readable.from([
      {
        id: 100, name: 'TABLE: 1, ROW: 1, STREAM: 1', created: date, updated: date,
        id2: 100, name2: 'TABLE: 2, ROW: 1, STREAM: 1', report2: report, created2: date, updated2: date
      }
    ])
  )

  // The driver module currently doesn't support Fs.ReadStream/Fs.createReadStream()
  const report = await Fs.promises.readFile('./test/files/audit-report.png');

  // Insert rows into multiple tables within a single execution
  const rslt = await manager.db[connName].create.table.rows({
    stream: 1, // stream for each record
    binds: {
      id: 100, name: 'TABLE: 1, ROW: 1, STREAM: 1', created: date, updated: date,
      id2: 100, name2: 'TABLE: 2, ROW: 1, STREAM: 1', report2: report, created2: date, updated2: date
    }
  });

  return rslt;
};