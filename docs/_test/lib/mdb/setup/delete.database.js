'use strict';

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  // delete the test database
  const rslt = await manager.db[connName].setup.delete.database();

  return rslt;
};