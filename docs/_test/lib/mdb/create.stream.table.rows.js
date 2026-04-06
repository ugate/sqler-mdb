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

  // The driver module currently doesn't support streaming into a column
  // (e.g. Fs.createReadStream())
  const report = await Fs.promises.readFile('./test/files/audit-report.png');

  // Insert rows into multiple tables within a single execution
  const rslts = await manager.db[connName].create.table.rows({
    // create binds will be batched in groups of 2 before streaming them to the database since
    // execOpts.stream = 2, but we could have batched them individually (stream = 1) as well
    // https://mariadb.com/kb/en/connector-nodejs-promise-api/#connectionbatchsql-values-promise
    stream: 2
    // no need to set execOpts.binds since they will be streamed from the create instead
  });

  for (let writeStream of rslts.rows) {
    await pipeline(
      // here we're just using some static values for illustration purposes, but they can come from a
      // any readable stream source like a file, database, etc. as long as they are "transformed"
      // into JSON binds before the sqler writable stream receives them
      Stream.Readable.from([
        {
          id: 100, name: 'TABLE: 1, ROW: 1, CREATE_STREAM: "Initial creation"', created: date, updated: date,
          id2: 100, name2: 'TABLE: 2, ROW: 1, CREATE_STREAM: "Initial creation"', report2: report, created2: date, updated2: date
        },
        {
          id: 200, name: 'TABLE: 1, ROW: 2, CREATE_STREAM: "Initial creation"', created: date, updated: date,
          id2: 200, name2: 'TABLE: 2, ROW: 2, CREATE_STREAM: "Initial creation"', report2: report, created2: date, updated2: date
        }
      ]),
      writeStream
    )
  }

  return rslts;
};