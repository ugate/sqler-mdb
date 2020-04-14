'use strict';

const Fs = require('fs');

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  // The odbc module needs the date to be in a valid ANSI compliant format.
  // Could also use:
  // https://www.npmjs.com/package/moment-db
  const date = new Date().toISOString().replace('T', ' ').replace('Z', '');

  // The odbc module currently doesn't support Fs.ReadStream/Fs.createReadStream()
  const report = await Fs.promises.readFile('./test/files/audit-report.png');

  // Insert rows into multiple tables within a single ODBC execution
  const rslt = await manager.db[connName].create.table.rows({
    binds: {
      id: 1, name: 'TABLE: 1, ROW: 1', created: date, updated: date,
      id2: 1, name2: 'TABLE: 2, ROW: 1', report2: report, created2: date, updated2: date
    }
  });

  return rslt;
};