'use strict';

const Stream = require('stream');
const { pipeline } = require('stream/promises');

/**
 * Example using streams
 * export just to illustrate module usage
 * @param {Manager} manager sqler manager
 * @param {String} connName The connection name to use 
 * @returns {Promise<typedefs.SQLERExecResults>}
 */
module.exports = async function runExample(manager, connName) {

  /** @type {typedefs.SQLERTransaction} */
  let tx;
  /** @type {typedefs.SQLERExecResults} */
  let rslts;
  try {
    tx = await manager.db[connName].beginTransaction();

    // We'll need to split create, call (stream), drop stored procedure into multiple
    // executions since we cannot stream the results with create/drop in the execution.
    // We can do this using sqler fragments defined in the SQL file
    await manager.db[connName].delete.stream.table.rows({
      autoCommit: false,
      transactionId: tx.id
    }, ['createStoredProcedure']);

    // Delete rows into multiple tables within a single execution
    rslts = await manager.db[connName].delete.stream.table.rows({
      // delete binds will be batched in groups of 2 before streaming them to the database since
      // execOpts.stream = 2, but we could have batched them individually (stream = 1) as well
      // https://mariadb.com/kb/en/connector-nodejs-promise-api/#connectionbatchsql-values-promise
      stream: 2,
      // no need to set execOpts.binds since they will be streamed from the create instead
      autoCommit: false,
      transactionId: tx.id,
    }, ['callStoredProcedure']);

    for (let writeStream of rslts.rows) {
      await pipeline(
        // here we're just using some static values for illustration purposes, but they can come from a
        // any readable stream source like a file, database, etc. as long as they are "transformed"
        // into JSON binds before the sqler writable stream receives them
        Stream.Readable.from([
          {
            id: 100, id2: 100
          },
          {
            id: 200, id2: 200
          }
        ]),
        writeStream
      )
    }

    // drop the stored procedure (done here for brevity, in reality we'd want to ensure it's dropped if creation was successful)
    await manager.db[connName].delete.stream.table.rows({
      autoCommit: false,
      transactionId: tx.id
    }, ['dropStoredProcedure']);

    await tx.commit(true);
  } catch (err) {
    if (tx) await tx.rollback(true);
    throw err;
  }

  return rslts;
};

/**
 * @import { Manager, typedefs } from 'sqler'
 */