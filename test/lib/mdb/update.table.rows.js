'use strict';

// export just to illustrate module usage
module.exports = async function runExample(manager, connName) {

  const date = new Date();

  // binds
  const table1BindsArray = [
    {
      id: 1, name: '', updated: date
    }
  ];
  const table2BindsArray = [
    {
      id2: 1, name2: '', updated2: date
    }
  ];
  const rtn = {};

  //-------------------------------------------------------
  // There are two different ways to perform a transaction
  // 1. Implicit (suitable for a single execution per tx)
  // 2. Explicit (suitable for multiple executions per tx)

  // using implicit transactions:
  await implicitTransactionUpdate(manager, connName, rtn, table1BindsArray, table2BindsArray);

  // Using an explicit transaction:
  await explicitTransactionUpdate(manager, connName, rtn, table1BindsArray, table2BindsArray);

  // Using a prepared statement:
  await preparedStatementUpdate(manager, connName, rtn, table1BindsArray);

  // Using a prepared statement within an explicit transaction
  await preparedStatementExplicitTxUpdate(manager, connName, rtn, table1BindsArray);

  return rtn;
};

async function implicitTransactionUpdate(manager, connName, rtn, table1BindsArray, table2BindsArray) {
  // don't exceed connection pool count
  rtn.txImpRslts = new Array(table1BindsArray.length + table2BindsArray.length);

  // simple iterator over all the binds
  forEach('Implicit transaction', table1BindsArray, table2BindsArray, (idx, ti, ri, binds, nameProp) => {

    // Example execution in parallel using an implicit transaction for
    // each SQL execution (autoCommit = true is the default)
    rtn.txImpRslts[idx] = manager.db[connName].update[`table${ti + 1}`].rows({
      name: binds[nameProp], // execution name is optional
      binds
    });

  });

  // could have also ran is series by awaiting when the SQL function is called
  for (let i = 0; i < rtn.txImpRslts.length; i++) {
    rtn.txImpRslts[i] = await rtn.txImpRslts[i];
  }
}

async function explicitTransactionUpdate(manager, connName, rtn, table1BindsArray, table2BindsArray) {
  // don't exceed connection pool count
  rtn.txExpRslts = new Array(table1BindsArray.length + table2BindsArray.length);

  let tx;
  try {
    // start a transaction
    tx = await manager.db[connName].beginTransaction();

    // simple iterator over all the binds
    forEach('Explicit transaction', table1BindsArray, table2BindsArray, (idx, ti, ri, binds, nameProp) => {

      // Example execution in parallel (same transacion)
      rtn.txExpRslts[idx] = manager.db[connName].update[`table${ti + 1}`].rows({
        name: binds[nameProp], // execution name is optional
        binds,
        autoCommit: false,
        transactionId: tx.id, // ensure execution takes place within transaction
      });

    });
  
    // could have also ran is series by awaiting when the SQL function is called
    for (let i = 0; i < rtn.txExpRslts.length; i++) {
      rtn.txExpRslts[i] = await rtn.txExpRslts[i];
    }

    // commit the transaction
    await tx.commit();
  } catch (err) {
    if (tx) {
      // rollback the transaction
      await tx.rollback();
    }
    throw err;
  }
}

async function preparedStatementUpdate(manager, connName, rtn, table1BindsArray) {
  rtn.psRslts = new Array(table1BindsArray.length); // don't exceed connection pool count
  try {
    for (let i = 0; i < table1BindsArray.length; i++) {
      // update with expanded name
      table1BindsArray[i].name = `TABLE: 1, ROW: ${i + 1}, UPDATE_PS: "PS ${i + 1}"`;
      // Using an implicit transcation (autoCommit defaults to true):
      rtn.psRslts[i] = manager.db[connName].update.table1.rows({
        name: table1BindsArray[i].name, // name is optional
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
        binds: table1BindsArray[i]
      });
    }
    // wait for parallel executions to complete
    for (let i = 0; i < table1BindsArray.length; i++) {
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

async function preparedStatementExplicitTxUpdate(manager, connName, rtn, table1BindsArray) {
  rtn.txExpPsRslts = new Array(table1BindsArray.length); // don't exceed connection pool count
  let tx;
  try {
    // start a transaction
    tx = await manager.db[connName].beginTransaction();

    for (let i = 0; i < table1BindsArray.length; i++) {
      // update with expanded name
      table1BindsArray[i].name = `TABLE: 1, ROW: ${i + 1}, UPDATE_PS: "PS with txId ${tx.id}"`;
      rtn.txExpPsRslts[i] = manager.db[connName].update.table1.rows({
        name: table1BindsArray[i].name, // name is optional
        autoCommit: false, // don't auto-commit after execution
        transactionId: tx.id, // ensure execution takes place within transaction
        prepareStatement: true, // ensure a prepared statement is used
        driverOptions: {
          // prepared statements in MySQL/MariaDB use a temporary
          // stored procedure to execute prepared statements...
          // in order to do so, the stored procedure needs to have
          // a database scope defined where it will reside
          preparedStatementDatabase: 'sqlermysql'
        },
        // include the bind parameters
        binds: table1BindsArray[i]
      });
    }
    // wait for parallel executions to complete
    for (let i = 0; i < table1BindsArray.length; i++) {
      rtn.txExpPsRslts[i] = await rtn.txExpPsRslts[i];
    }

    // unprepare will be called when calling commit
    // (alt, could have called unprepare before commit)
    await tx.commit();
  } catch (err) {
    if (tx) {
      // unprepare will be called when calling rollback
      // (alt, could have called unprepare before rollback)
      await tx.rollback();
    }
    throw err;
  }
}

// just a utility function to iterate over muliple bind arrays and update bind names
function forEach(label, table1BindsArray, table2BindsArray, itemHandler) {
  const ln = table1BindsArray.length + table2BindsArray.length;
  for (let i = 0, ti, ri, barr, nameProp; i < ln; i++) {
    // select which table the binds are for
    if (i < table1BindsArray.length) {
      ti = 0;
      ri = i;
      barr = table1BindsArray;
    } else {
      ti = 1;
      ri = i - table1BindsArray.length;
      barr = table2BindsArray;
    }
    nameProp = `name${ti ? ti + 1 : ''}`;

    // update with expanded name
    barr[ri][nameProp] = `TABLE: ${ti + 1}, ROW: ${ri + 1}, UPDATE: "${label} ${i + 1}"`;

    itemHandler(i, ti, ri, barr[ri], nameProp);
  }
}