'use strict';

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  const date = new Date();

  // binds
  const binds1 = {
    id: 1, name: 'TABLE: 1, ROW: 1 (UPDATE)', updated: date
  };
  const binds2 = {
    id2: 1, name2: 'TABLE: 2, ROW: 1 (UPDATE)', updated2: date
  };
  const rtn = {};

  //-------------------------------------------------------
  // There are two different ways to perform a transaction
  // 1. Implicit (suitable for a single execution per tx)
  // 2. Explicit (suitable for multiple executions per tx)

  // using implicit transactions:
  await implicitTransactionUpdate(manager, connName, binds1, binds2, rtn);

  // Using an explicit transaction:
  await explicitTransactionUpdate(manager, connName, binds1, binds2, rtn);

  // Using a prepared statement:
  await preparedStatementUpdate(manager, connName, binds1, rtn);

  // Using a prepared statement within an explicit transaction
  await preparedStatementExplicitTxUpdate(manager, connName, binds1, rtn);

  return rtn;
};

async function implicitTransactionUpdate(manager, connName, binds1, binds2, rtn) {
  rtn.txImpRslts = new Array(2); // don't exceed connection pool count

  // Example execution in parallel using an implicit transaction for
  // each SQL execution (autoCommit = true is the default)
  rtn.txImpRslts[0] = manager.db[connName].update.table1.rows({
    name: 'TX Implicit 1 (UPDATE)', // name is optional
    binds: binds1
  });
  rtn.txImpRslts[1] = manager.db[connName].update.table2.rows({
    name: 'TX Implicit 2 (UPDATE)', // name is optional
    binds: binds2
  });
  // could have also ran is series by awaiting when the SQL function is called
  rtn.txImpRslts[0] = await rtn.txImpRslts[0];
  rtn.txImpRslts[1] = await rtn.txImpRslts[1];
}

async function explicitTransactionUpdate(manager, connName, binds1, binds2, rtn) {
  rtn.txExpRslts = new Array(2); // don't exceed connection pool count
  try {
    // start a transaction
    const txId = await manager.db[connName].beginTransaction();

    // Example execution in parallel (same transacion)
    rtn.txExpRslts[0] = manager.db[connName].update.table1.rows({
      name: 'TX Explicit 1 (UPDATE)', // name is optional
      autoCommit: false,
      transactionId: txId, // ensure execution takes place within transaction
      binds: binds1
    });
    rtn.txExpRslts[1] = manager.db[connName].update.table2.rows({
      name: 'TX Explicit 2 (UPDATE)', // name is optional
      autoCommit: false,
      transactionId: txId, // ensure execution takes place within transaction
      binds: binds2
    });
    // could have also ran is series by awaiting when the SQL function is called
    rtn.txExpRslts[0] = await rtn.txExpRslts[0];
    rtn.txExpRslts[1] = await rtn.txExpRslts[1];

    // could commit using either one of the returned results
    await rtn.txExpRslts[0].commit();
  } catch (err) {
    if (rtn.txExpRslts[0] && rtn.txExpRslts[0].rollback) {
      // could rollback using either one of the returned results
      await rtn.txExpRslts[0].rollback();
    }
    throw err;
  }
}

async function preparedStatementUpdate(manager, connName, binds, rtn) {
  rtn.psRslts = new Array(2); // don't exceed connection pool count
  try {
    for (let i = 0; i < rtn.psRslts.length; i++) {
      // update with expanded name
      binds.name = `TABLE: 1, ROW: ${i} (Prepared statement UPDATE)`;
      // Using an implicit transcation (autoCommit defaults to true):
      rtn.psRslts[i] = manager.db[connName].update.table1.rows({
        name: `PS ${i} (UPDATE)`, // name is optional
        // flag the SQL execution as a prepared statement
        // this will cause the statement to be prepared
        // and a dedicated connection to be allocated from
        // the pool just before the first SQL executes
        prepareStatement: true,
        driverOptions: {
          // prepared statements in MySQL/MariaDB use a temporary
          // stored procedure to execute prepared statements...
          // in order to do so, the stored procedure needs to have
          // a database scope defined where it will reside
          preparedStatementDatabase: 'sqlermysql'
        },
        // include the bind parameters
        binds
      });
    }
    // wait for parallel executions to complete
    for (let i = 0; i < rtn.psRslts.length; i++) {
      rtn.psRslts[i] = await rtn.psRslts[i];
    }
  } finally {
    // could call unprepare using any of the returned execution results
    if (rtn.psRslts[0] && rtn.psRslts[0].unprepare) {
      // since prepareStatement = true, we need to close the statement
      // and release the statement connection back to the pool
      // (also drops the temporary stored procedure that executes the
      // prepared statement)
      await rtn.psRslts[0].unprepare();
    }
  }
}

async function preparedStatementExplicitTxUpdate(manager, connName, binds, rtn) {
  rtn.txExpPsRslts = new Array(2); // don't exceed connection pool count
  try {
    // start a transaction
    const txId = await manager.db[connName].beginTransaction();

    for (let i = 0; i < rtn.txExpPsRslts.length; i++) {
      // update with expanded name
      binds.name += `TABLE: 1, ROW: ${i} (Prepared statement with txId "${txId}" UPDATE)`;
      rtn.txExpPsRslts[i] = manager.db[connName].update.table1.rows({
        name: `TX/PS ${i} (UPDATE)`, // name is optional
        autoCommit: false, // don't auto-commit after execution
        transactionId: txId, // ensure execution takes place within transaction
        prepareStatement: true, // ensure a prepared statement is used
        driverOptions: {
          // prepared statements in MySQL/MariaDB use a temporary
          // stored procedure to execute prepared statements...
          // in order to do so, the stored procedure needs to have
          // a database scope defined where it will reside
          preparedStatementDatabase: 'sqlermysql'
        },
        binds
      });
    }
    // wait for parallel executions to complete
    for (let i = 0; i < rtn.txExpPsRslts.length; i++) {
      rtn.txExpPsRslts[i] = await rtn.txExpPsRslts[i];
    }

    // unprepare will be called when calling commit
    // (alt, could have called unprepare before commit)
    await rtn.txExpPsRslts[0].commit();
  } catch (err) {
    if (rtn.txExpPsRslts[0] && rtn.txExpPsRslts[0].rollback) {
      // unprepare will be called when calling rollback
      // (alt, could have called unprepare before rollback)
      await rtn.txExpPsRslts[0].rollback();
    }
    throw err;
  }
}