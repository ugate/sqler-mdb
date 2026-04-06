'use strict';

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  // Delete rows from multiple tables within a single execution
  const rslt = await manager.db[connName].delete.table.rows({
    binds: { id: 1, id2: 1 }
  });

  return rslt;
};