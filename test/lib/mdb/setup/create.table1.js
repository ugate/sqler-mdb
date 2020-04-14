'use strict';

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  // create test table records
  const rslt = await manager.db[connName].setup.create.table1();

  return rslt;
};