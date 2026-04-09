'use strict';

const typedefs = require('sqler/typedefs');
const Stream = require('stream');
// node >= v16 :
// const { pipeline } = require('stream/promises');
// node < 16 :
const Util = require('util');
const pipeline = Util.promisify(Stream.pipeline);

// export just to illustrate module usage
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
    let injectedErr;
    let sawCommitOrRollback = false;
    let settled = false;

    const afterStream = new Promise((resolve, reject) => {
      const done = (fn, val) => {
        if (settled) return;
        settled = true;
        fn(val);
      };

      writeStream.once(typedefs.EVENT_STREAM_COMMIT, (txId) => {
        sawCommitOrRollback = true;
        injectedErr = new ExpectedError(`Testing transaction error for transaction: ${txId}`);
        writeStream.destroy(injectedErr);
      });

      writeStream.once(typedefs.EVENT_STREAM_ROLLBACK, (txId) => {
        sawCommitOrRollback = true;
        injectedErr = new UnExpectedError(
          `Should not have rolled back transaction "${txId}" since it should have already been committed!`
        );
        writeStream.destroy(injectedErr);
      });

      writeStream.once('error', (err) => {
        done(reject, err);
      });

      writeStream.once('close', () => {
        if (injectedErr) return done(reject, injectedErr);
        if (!sawCommitOrRollback) {
          return done(reject, new UnExpectedError(
            'Stream closed before commit/rollback event was observed'
          ));
        }
        done(resolve);
      });
    });

    try {
      await Promise.all([
        pipeline(Stream.Readable.from([binds]), writeStream),
        afterStream
      ]);
    } catch (err) {
      try {
        await tx.rollback(true);
      } catch (rberr) {
        err.rollbackError = rberr;
      }
      throw err;
    }
  }
}

class ExpectedError extends Error {
}

class UnExpectedError extends Error {
}