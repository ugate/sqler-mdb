'use strict';

const Os = require('os');
const Fs = require('fs');

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  // stream read from multiple tables
  const rslt = await manager.db[connName].read.table.rows({ binds: { name: 'table' } });

  // write binary report buffer to file?
  const fileWriteProms = [];
  for (let row of rslt.rows) {
    if (row.report) {
      // store the path to the report (illustrative purposes only)
      row.reportPath = `${Os.tmpdir()}/sqler-${connName}-read-${row.id}.png`;
      fileWriteProms.push(Fs.promises.writeFile(row.reportPath, row.report));
    }
  }
  if (fileWriteProms.length) {
    await Promise.all(fileWriteProms);
  }

  return rslt;
};