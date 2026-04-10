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

  const date = new Date();

  // binds
  const table1Binds = {
    id: 400, name: 'Error test after commit', updated: date
  };
  const rtn = {};

  try {
    await explicitTransactionUpdate(manager, connName, rtn, table1Binds);
  } catch (err) {
    if (!(err instanceof ExpectedError)) console.error('Failed to throw the expected error', err);
    throw err;
  }

  return rtn;
};

/**
 * Example using streams
 * export just to illustrate module usage
 * @param {Manager} manager sqler manager
 * @param {String} connName The connection name to use 
 * @param {typedefs.SQLERExecResults} rtn Returned results
 * @param {Object} binds Parameter binds
 */
async function explicitTransactionUpdate(manager, connName, rtn, binds) {
  /** @type {typedefs.SQLERTransaction} */
  const tx = await manager.db[connName].beginTransaction();

  // don't exceed connection pool count
  rtn.txExpRslts = await manager.db[connName].update.table1.rows({
    autoCommit: true,
    transactionId: tx.id,
    stream: 1
    // no need to set execOpts.binds since they will be streamed from the update instead
  });

  for (let writeStream of rtn.txExpRslts.rows) {
    let settled = false;
    let sawTerminalTxEvent = false;

    const streamResult = new Promise((resolve, reject) => {
      const done = (fn, val) => {
        if (settled) return;
        settled = true;
        fn(val);
      };

      writeStream.once(typedefs.EVENT_STREAM_COMMIT, (txId) => {
        sawTerminalTxEvent = true;
        done(reject, new ExpectedError(
          `Testing transaction error for transaction: ${txId}`
        ));
      });

      writeStream.once(typedefs.EVENT_STREAM_ROLLBACK, (txId) => {
        sawTerminalTxEvent = true;
        done(reject, new UnExpectedError(
          `Should not have rolled back transaction "${txId}" since it should have already been committed!`
        ));
      });

      writeStream.once('error', (err) => {
        done(reject, err);
      });

      writeStream.once('end', async () => {
        try {
          await tx.rollback(true);
        } catch (rberr) {
          return done(reject, rberr);
        }
      });

      writeStream.once('close', () => {
        if (!sawTerminalTxEvent) {
          return done(reject, new UnExpectedError(
            'Stream closed before commit/rollback event was observed'
          ));
        }
        done(resolve);
      });
    });

    await Promise.all([
      pipeline(Stream.Readable.from([binds]), writeStream),
      streamResult
    ]);
  }
}

class ExpectedError extends Error {
}

class UnExpectedError extends Error {
}

/**
 * @import { Manager, typedefs } from 'sqler'
 */