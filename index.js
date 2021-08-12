'use strict';

const Stream = require('stream');
const typedefs = require('sqler/typedefs');

const MAX_MDB_NAME_LGTH = 64;

/**
 * MariaDB + MySQL {@link Dialect} implementation for [`sqler`](https://ugate.github.io/sqler/)
 */
class MDBDialect {

  /**
   * Constructor
   * @constructs MDBDialect
   * @param {typedefs.SQLERPrivateOptions} priv The private configuration options
   * @param {MDBConnectionOptions} connConf The individual SQL __connection__ configuration for the given dialect that was passed into the originating {@link Manager}
   * @param {typedefs.SQLERTrack} track Container for sharing data between {@link Dialect} instances.
   * @param {Function} [errorLogger] A function that takes one or more arguments and logs the results as an error (similar to `console.error`)
   * @param {Function} [logger] A function that takes one or more arguments and logs the results (similar to `console.log`)
   * @param {Boolean} [debug] A flag that indicates the dialect should be run in debug mode (if supported)
   */
  constructor(priv, connConf, track, errorLogger, logger, debug) {
    if (!connConf.driverOptions) throw new Error('Connection configuration is missing required driverOptions');
    const dlt = internal(this);
    dlt.at.track = track;
    dlt.at.driver = require('mariadb');
    dlt.at.transactions = new Map();
    dlt.at.stmtFuncs = new Map();
    dlt.at.stmts = new Map();
    dlt.at.opts = {
      autoCommit: true, // default autoCommit = true to conform to sqler
      id: `sqlerMDBGen${Math.floor(Math.random() * 10000)}`,
      connection: connConf.driverOptions.connection ? dlt.at.track.interpolate({}, connConf.driverOptions.connection, dlt.at.driver) : {}
    };
    // merge connection options into pool options
    dlt.at.opts.pool = connConf.driverOptions.pool ? 
      dlt.at.track.interpolate(dlt.at.opts.connection, connConf.driverOptions.pool, dlt.at.driver) : 
      dlt.at.opts.connection;
    // for universal sqler compatibility, named place holders are the default
    if (!dlt.at.opts.pool.hasOwnProperty('namedPlaceholders')) {
      dlt.at.opts.pool.namedPlaceholders = true;
    }
    // sqler compatible state
    dlt.at.state = {
      pending: 0,
      connection: { count: 0, inUse: 0 }
    };

    dlt.at.errorLogger = errorLogger;
    dlt.at.logger = logger;
    dlt.at.debug = debug;

    if (priv.host) dlt.at.opts.pool.host = priv.host;
    if (priv.hasOwnProperty('port')) dlt.at.opts.pool.port = priv.port;
    dlt.at.opts.pool.user = priv.username;
    dlt.at.opts.pool.password = priv.password;

    if (connConf.pool) {
      if (connConf.pool.hasOwnProperty('min')) dlt.at.opts.pool.minimumIdle = connConf.pool.min;
      if (connConf.pool.hasOwnProperty('max')) dlt.at.opts.pool.connectionLimit = connConf.pool.max;
      if (connConf.pool.hasOwnProperty('idle')) dlt.at.opts.pool.idleTimeout = connConf.pool.idle;
      // if (connConf.pool.hasOwnProperty('increment')) dlt.at.opts.pool.incrementSize = connConf.pool.increment; // not supported
      if (connConf.pool.hasOwnProperty('timeout')) {
        dlt.at.opts.pool.acquireTimeout = connConf.pool.timeout;
        dlt.at.opts.pool.connectTimeout = connConf.pool.timeout;
      }
    }
  }

  /**
   * Initializes {@link MDBDialect} by creating the connection pool
   * @param {typedefs.SQLERInitOptions} opts The options described by the `sqler` module
   * @returns {Object} The MariaDB/MySQL connection pool
   */
  async init(opts) {
    const dlt = internal(this), numSql = opts.numOfPreparedFuncs;
    let conn, error;
    try {
      dlt.at.pool = dlt.at.driver.createPool(dlt.at.opts.pool);
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mdb: Connection pool "${dlt.at.opts.id}" created with (${numSql} SQL files) ` +
          `acquireTimeout=${dlt.at.opts.pool.acquireTimeout} minimumIdle=${dlt.at.opts.pool.minimumIdle} ` +
          `connectionLimit=${dlt.at.opts.pool.connectionLimit} idleTimeout=${dlt.at.opts.pool.idleTimeout}`);
      }
      conn = await dlt.at.pool.getConnection();
      await conn.ping();
      return dlt.at.pool;
    } catch (err) {
      error = err;
      const msg = `sqler-mdb: connection pool "${dlt.at.opts.id}" could not be created`;
      if (dlt.at.errorLogger) dlt.at.errorLogger(`${msg} (passwords are omitted from error) ${JSON.stringify(err, null, ' ')}`);
      const pconf = Object.assign({}, dlt.at.opts.pool);
      delete pconf.password;
      err.message = `${err.message}\n${msg} for ${JSON.stringify(pconf, null, ' ')}`;
      err.sqlerMDB = pconf;
      throw err;
    } finally {
      if (conn) {
        await operation(dlt, 'release', false, conn, opts, null, error)();
      }
    }
  }

  /**
   * Begins a transaction by opening a connection from the pool
   * @param {String} txId The internally generated transaction identifier
   * @param {typedefs.SQLERTransactionOptions} opts The transaction options passed in via the public API
   * @returns {typedefs.SQLERTransaction} The transaction that was started
   */
  async beginTransaction(txId) {
    const dlt = internal(this);
    if (dlt.at.logger) {
      dlt.at.logger(`sqler-mdb: Beginning transaction "${txId}" on connection pool "${dlt.at.opts.id}"`);
    }
    /** @type {SQLERTransaction} */
    const tx = {
      id: txId,
      state: Object.seal({
        isCommitted: false,
        isRolledback: false,
        pending: 0
      })
    };
    /** @type {MDBTransactionObject} */
    const txo = { tx, conn: await dlt.at.pool.getConnection() };
    const opts = { transactionId: tx.id };
    await txo.conn.beginTransaction();
    tx.commit = operation(dlt, 'commit', true, txo, opts, 'unprepare');
    tx.rollback = operation(dlt, 'rollback', true, txo, opts, 'unprepare');
    Object.freeze(tx);
    dlt.at.transactions.set(txId, txo);
    return tx;
  }

  /**
   * Executes a SQL statement
   * @param {String} sql the SQL to execute
   * @param {MDBExecOptions} opts The execution options
   * @param {String[]} frags the frament keys within the SQL that will be retained
   * @param {typedefs.SQLERExecMeta} meta The SQL execution metadata
   * @param {(typedefs.SQLERExecErrorOptions | Boolean)} [errorOpts] The error options to use
   * @returns {typedefs.SQLERExecResults} The execution results
   */
  async exec(sql, opts, frags, meta, errorOpts) {
    const dlt = internal(this);
    const txo = opts.transactionId ? dlt.at.transactions.get(opts.transactionId) : null;
    let conn, rslts, error;
    /** @type {ExecMeta} */
    let execMeta;
    /** @type {MDBPreparedStatement} */
    let pso;
    try {
      /** @type {typedefs.SQLERExecResults} */
      const rtn = {};

      if (opts.prepareStatement) {
        pso = await prepared(dlt, sql, opts, meta, txo, rtn);
      } else {
        execMeta = createExecMeta(dlt, sql, opts);
      }

      if (!txo && !opts.prepareStatement && opts.type === 'READ') {
        if (opts.stream >= 0) {
          rslts = [ await createReadStream(dlt, execMeta, opts, txo) ];
        } else {
          rslts = await dlt.at.pool.query(execMeta.sql, execMeta.binds);
        }
      } else {
        if (opts.prepareStatement) {
          if (opts.stream >= 0) {

          } else {
            execMeta = createExecMeta(dlt, sql, opts);
            rslts = await pso.exec();
          }
        } else {
          if (opts.stream >= 0) {
            rslts = [ createWriteStream(dlt, sql, opts, txo) ];
          } else {
            conn = txo ? null : await dlt.at.pool.getConnection();
            rslts = await (txo ? txo.conn : conn).query(execMeta.sql, execMeta.binds);
          }
        }
        if (txo) {
          if (rtn.unprepare) {
            txo.unprepares = txo.unprepares || new Map();
            txo.unprepares.set(pso.name, rtn.unprepare); // keep track of the prepared statements that have transaction scope
          }
          if (opts.autoCommit) {
            // MariaDB/MySQL has no option to autocommit during SQL execution
            await operation(dlt, 'commit', false, txo, opts, 'unprepare')();
          } else {
            dlt.at.state.pending++;
          }
        }
      }
      rtn.rows = rslts;
      rtn.raw = rslts;
      return rtn;
    } catch (err) {
      error = err;
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`Failed to execute the following SQL: ${sql}`, err);
      }
      err.sqlerMDB = {};
      if (pso) err.sqlerMDB.preparedStmtProc = pso.psql;
      throw err;
    } finally {
      // transactions/prepared statements need the connection to remain open until commit/rollback/unprepare
      if (conn && !opts.prepareStatement) {
        try {
          await operation(dlt, 'release', false, conn, opts)();
        } catch (cerr) {
          if (error) error.releaseError = cerr;
        }
      }
    }
  }

  /**
   * Closes the MariaDB/MySQL connection pool
   * @returns {Integer} The number of connections closed
   */
  async close() {
    const dlt = internal(this);
    try {
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mdb: Closing connection pool "${dlt.at.opts.id}" (${statusLabel(dlt)})`);
      }
      if (dlt.at.pool) {
        await dlt.at.pool.end();
        dlt.at.transactions.clear();
        dlt.at.stmts.clear();
      }
      return dlt.at.state.pending;
    } catch (err) {
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`sqler-mdb: Failed to close connection pool "${dlt.at.opts.id}" (${statusLabel(dlt)})`, err);
      }
      throw err;
    }
  }

  /**
   * @returns {typedefs.SQLERState} The state
   */
  get state() {
    return JSON.parse(JSON.stringify(internal(this).at.state));
  }

  /**
   * @protected
   * @returns {Object} The MariaDB/MySQL driver module
   */
  get driver() {
    return internal(this).at.driver;
  }
}

module.exports = MDBDialect;

/**
 * Creates bind parameters suitable for SQL execution in MySQL/MariaDB
 * @private
 * @param {MDBInternal} dlt The internal MariaDB/MySQL object instance
 * @param {String} sql the SQL to execute
 * @param {MDBExecOptions} opts The execution options
 * @param {Object} [bindsAlt] An alternative to `opts.binds` that will be used
 * @returns {ExecMeta} The binds metadata
 */
function createExecMeta(dlt, sql, opts, bindsAlt) {
  /** @type {ExecMeta} */
  const rtn = {};

  // interpolate and remove unused binds since
  // MariaDB/MySQL only accepts the exact number of bind parameters (also, cuts down on payload bloat)
  rtn.bndp = dlt.at.track.interpolate({}, bindsAlt || opts.binds, dlt.at.driver, props => sql.includes(`:${props[0]}`));
  // execution formatted version of `rtn.bndp` that is an array of values format to support MySQL/MariaDB use of `?` parameter markers
  // (empty when the bind meta is for a prepared statement)
  let ebndp;
  // formatted/bound execution SQL statement
  let esql;

  // driver options exec override the 
  rtn.dopts = opts.driverOptions || {};
  const named = rtn.dopts.exec && rtn.dopts.exec.hasOwnProperty('namedPlaceholders') ? rtn.dopts.exec.namedPlaceholders :
    dlt.at.opts.pool.namedPlaceholders;
  if (opts.prepareStatement) { // prepared statements always use named parameter markers
    if (!rtn.dopts.preparedStatementDatabase) {
      throw new Error('A valid database name must be provided using "execOpts.driverOptions.preparedStatementDatabase" ' +
        'when "execOpts.prepareStatement = true"');
    }
    esql = dlt.at.track.positionalBinds(sql, rtn.bndp, [], pname => `@${pname}`);
  } else { // use "?" parameter markers
    esql = named ? sql : dlt.at.track.positionalBinds(sql, rtn.bndp, ebndp = []);
  }
  if (rtn.dopts.exec) rtn.dopts.exec.sql = esql;

  rtn.sql = rtn.dopts.exec || esql;
  rtn.binds = ebndp || rtn.bndp;

  return rtn;
}

/**
 * Executes a function by name that resides on the MariaDB/MySQL connection
 * @private
 * @param {MDBInternal} dlt The internal MariaDB/MySQL object instance
 * @param {String} name The name of the function that will be called on the connection
 * @param {Boolean} reset Truthy to reset the pending connection and transaction count when the operation completes successfully
 * @param {(MDBTransactionObject | Object)} txoOrConn Either the transaction object or the connection itself
 * @param {typedefs.SQLERExecOptions} [opts] The {@link SQLERExecOptions}
 * @param {String} [preop] An operation name that will be performed before the actual operation. The following values are valid:
 * 1. __`unprepare`__ - Any un-prepare functions that are associated with the passed {@link PGTransactionObject} will be executed.
 * @returns {Function} A no-arguement `async` function that returns the number or pending transactions
 */
function operation(dlt, name, reset, txoOrConn, opts, preop) {
  return async () => {
    /** @type {MDBTransactionObject} */
    const txo = opts.transactionId && txoOrConn.tx ? txoOrConn : null;
    const conn = txo ? txo.conn : txoOrConn;
    let ierr;
    if (preop === 'unprepare') {
      if (txo.unprepares) {
        for (let unprepare of txo.unprepares.values()) {
          await unprepare();
        }
        txo.unprepares.clear();
      }
    }
    try {
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mdb: Performing ${name} on connection pool "${dlt.at.opts.id}" (${statusLabel(dlt)})`);
      }
      await conn[name]();
      if (reset) { // not to be confused with mariadb connection.reset();
        if (txo) dlt.at.transactions.delete(txo.tx.id);
        dlt.at.state.pending = 0;
      }
    } catch (err) {
      ierr = err;
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`sqler-mdb: Failed to ${name} ${dlt.at.state.pending} transaction(s) with options: ${
          opts ? JSON.stringify(opts) : 'N/A'}`, ierr);
      }
      throw ierr;
    } finally {
      if (name !== 'end' && name !== 'release') {
        try {
          await conn.release();
        } catch (cerr) {
          if (ierr) {
            ierr.releaseError = cerr;
          }
        }
      }
    }
    return dlt.at.state.pending;
  };
}

/**
 * 
 * @private
 * @param {MDBInternal} dlt The internal MariaDB/MySQL object instance
 * @param {String} sql The raw SQL to execute for the prepared statement
 * @param {MDBExecOptions} opts The execution options
 * @param {typedefs.SQLERExecMeta} meta The SQL execution metadata
 * @param {MDBTransactionObject} [txo] The transaction object to use. When not specified, a connection will be established.
 * @param {typedefs.SQLERExecResults} rtn The execution results used by the prepared statement where `unprepare` will be set
 * @returns {MDBPreparedStatement} The prepared statement
 */
async function prepared(dlt, sql, opts, meta, txo, rtn) {
  let isPrepare;
  /** @type {MDBPreparedStatement} */
  let pso;
  if (dlt.at.stmts.has(meta.name)) {
    pso = dlt.at.stmts.get(meta.name);
  } else {
    isPrepare = true;
    pso = { name: meta.name, sql };
    // set before async in case concurrent PS invocations
    dlt.at.stmts.set(pso.name, pso);
    pso.connProm = txo ? Promise.resolve(txo.conn) : dlt.at.pool.getConnection();  // other PS exec need access to promise in order to wait for connection access
    pso.conn = await pso.connProm; // wait for the initial PS to establish a connection (other PS exec need access to promise)
    pso.connProm = null; // reset promise once it completes
  }
  rtn.unprepare = async () => {
    const hasTX = opts.transactionId && dlt.at.transactions.has(opts.transactionId);
    if (dlt.at.stmts.has(meta.name)) {
      const pso = dlt.at.stmts.get(meta.name);
      try {
        await pso.conn.query(`DEALLOCATE PREPARE ${pso.name}`);
        dlt.at.stmts.delete(meta.name);
        // need to drop separately since drop procedure cannot be done from within a procedure
        await pso.conn.query(`DROP PROCEDURE ${pso.procedure}`);
      } finally {
        if (!hasTX) await pso.conn.release();
      }
    } else if (!hasTX) await conn.release();
  };
  if (isPrepare) {
    pso.name = meta.name;
    pso.shortName = pso.name.length > MAX_MDB_NAME_LGTH ? `sqler_mdb_prep_stmt${Math.floor(Math.random() * 10000)}` : pso.name;
    pso.execMeta = createExecMeta(dlt, sql, opts, bindsAlt);
    pso.procedure = `\`${pso.execMeta.dopts.preparedStatementDatabase}\`.\`${pso.shortName}\``;
    pso.escapedSQL = pso.conn.escape(pso.execMeta.sql); // execMeta.sql.replace(/([^'\\]*(?:\\.[^'\\]*)*)'/g, "$1\\'");
    pso.bnames = Object.getOwnPropertyNames(pso.execMeta.bndp);
    pso.psql = preparedStmtProc(pso);
    pso.procProm = pso.conn.query(pso.psql); // prepare/exec PS (other exec need access to wait for proc to be created)
    await pso.procProm; // wait for the PS stored proc to be created
    pso.prepareExecProm = preparedStmtProcExec(pso, conn, pso.execMeta.bndp, true);  // wait for the initial PS stored proc to be created/executed
    pso.procProm = pso.prepareExecProm = null; // reset promises once they completed
    pso.exec = async (binds) => {
      /** @type {ExecMeta} */
      let execMeta;
      if (binds || !) {
        execMeta = createExecMeta(dlt, sql, opts, binds);
      }
      return preparedStmtProcExec(pso, pso.conn, execMeta.bndp);
    };
  } else {
    pso = dlt.at.stmts.get(meta.name);
    if (pso.connProm) await pso.connProm; // wait for the initial PS to establish a connection
    if (pso.procProm) await pso.procProm; // wait for the initial PS stored proc to be created
    if (pso.prepareExecProm) await pso.prepareExecProm; // wait for the initial PS to be prepared
  }
  return pso;
}

/**
 * Generates a stored procedure that accepts an _operation name_ and a JSON data type.
 * The operation name can be one of the following:
 * - `prepare` - Prepares the statement
 * - `execute` - Executes the statement using the passed JSON
 * - `prepare_execute` - Prepares and executes the statement using the passed JSON
 * @private
 * @param {MDBPreparedStatement} pso The prepared statement object that will be used to generate the stored procedure
 * @returns {String} The stored procedure for the prepared statement
 */
function preparedStmtProc(pso) {
  return `CREATE PROCEDURE ${pso.procedure}(IN oper VARCHAR(15), IN vars JSON)
      BEGIN
        IF (oper = 'prepare' OR oper = 'prepare_execute') THEN
          PREPARE ${pso.shortName} FROM ${pso.escapedSQL};
        END IF;
        IF (oper = 'execute' OR oper = 'prepare_execute') THEN 
          ${ pso.bnames.length ? pso.bnames.map(nm => `
            SET @${nm} := JSON_UNQUOTE(JSON_EXTRACT(vars, '$.${nm}'));`).join('') : ''
          }
          EXECUTE ${pso.shortName};
        END IF;
      END;
    `;
}

/**
 * Calls a prepared statement stored procedure execution 
 * @private
 * @param {MDBPreparedStatement} pso The prepared statement object that will be used to generate the stored procedure
 * @param {Object} conn The connection
 * @param {Object} binds The binds
 * @param {Boolean} [prepare] Truthy to prepare the satement before execution
 * @returns {Promise} The prepared statement procedure call promise
 */
function preparedStmtProcExec(pso, conn, binds, prepare) {
  return conn.query(`CALL ${pso.procedure}('${prepare ? 'prepare_' : ''}execute', JSON_OBJECT(${
    pso.bnames.map(name => `${conn.escape(name)},${conn.escape(binds[name])}`).join(',')
  }))`);
}

/**
 * Returns a label that contains connection details, transaction counts, etc.
 * @private
 * @param {MDBInternal} dlt The internal MariaDB/MySQL object instance
 * @returns {String} The status label
 */
function statusLabel(dlt) {
  return `uncommitted transactions: ${dlt.at.state.pending}${dlt.at.pool ? `, total connections: ${dlt.at.pool.totalConnections()}, active connections: ${
    dlt.at.pool.activeConnections()}, idle connections: ${dlt.at.pool.idleConnections()}, queue size: ${dlt.at.pool.taskQueueSize()}` : ''}`;
}

/**
 * Creates a read stream that batches the read SQL executions
 * @private
 * @param {MDBInternal} dlt The internal MariaDB/MySQL object instance
 * @param {ExecMeta} execMeta The metadata that contains the SQL to execute and the binds parameters to use
 * @param {MDBExecOptions} opts The execution options
 * @param {MDBTransactionObject} [txo] The transaction object to use. When not specified, a connection will be established on the first write to the stream.
 * @returns {Stream.Readable} The created read stream
 */
async function createReadStream(dlt, execMeta, opts, txo) {
  const conn = txo ? txo.conn : await dlt.at.pool.getConnection();
  const readable = conn.queryStream(execMeta.sql, execMeta.binds);
  readable.on('end', async () => {
    await operation(dlt, 'release', false, conn, opts)();
  });
  return readable;
}

/**
 * Creates a write stream that batches the write SQL executions
 * @private
 * @param {MDBInternal} dlt The internal MariaDB/MySQL object instance
 * @param {String} sql The SQL to execute
 * @param {MDBExecOptions} opts The execution options
 * @param {MDBTransactionObject} [txo] The transaction object to use. When not specified, a connection will be established on the first write to the stream.
 * @returns {Stream.Writable} The created write stream
 */
function createWriteStream(dlt, sql, opts, txo) {
  /** @type {ExecMeta} */
  let execMeta;
  let conn;
  const writable = dlt.at.track.writable(opts, async (batch) => {
    const rslts = new Array(batch.length);
    let bi = 0;
    for (let binds of batch) {
      execMeta = createExecMeta(dlt, sql, opts, binds);
      if ((!txo || !txo.conn) && !conn) {
        conn = await dlt.at.pool.getConnection();
      }
      rslts[bi] = await (txo ? txo.conn : conn).batch(execMeta.sql, execMeta.binds);
      bi++;
    }
    return rslts;
  });
  if (!txo || !txo.conn) {
    writable.on('end', async () => {
      if (!conn) return;
      await operation(dlt, 'release', false, conn, opts)();
    });
  }
  return writable;
}

// private mapping
let map = new WeakMap();

/**
 * Internal state generator
 * @private
 * @param {MDBDialect} dialect The dialect instance
 * @returns {MDBInternal} The internal dialect state
 */
let internal = function(dialect) {
  if (!map.has(dialect)) {
    map.set(dialect, {});
  }
  return {
    at: map.get(dialect),
    this: dialect
  };
};

/**
 * @typedef {Object} MDBInternal
 * @property {MDBDialect} this The dialect instance
 * @property {Object} at The internal dialect state
 * @property {typedefs.SQLERTrack} at.track The track
 * @property {Object} at.driver The dialect driver
 * @property {Map<String, MDBTransactionObject>} at.transactions The transactions map
 * @property {Map<String, MDBPreparedStatement>} at.stmts The prepared statement map
 * @property {MDBExecOptions} at.opts The __global__ execution options
 * @property {Object} at.pool The connection pool
 * @property {typedefs.SQLERState} at.state The __global__ dialect state
 * @private
 */

/**
 * MariaDB + MySQL specific extension of the {@link SQLERConnectionOptions} from the [`sqler`](https://ugate.github.io/sqler/) module.
 * @typedef {Object} MDBConnectionOptionsType
 * @property {Object} driverOptions The `mariadb` (w/MySQL support) module specific options. __Both `connection` and `pool` will be merged when generating
 * the connection pool.__
 * @property {Object} [driverOptions.connection] An object that will contain properties/values that will be used to construct the MariaDB + MySQL connection
 * (e.g. `{ database: 'mydb', timezone: '-0700' }`). See the `mariadb` module documentation for a full listing of available connection options.
 * When a property value is a string surrounded by `${}`, it will be assumed to be a property that resides on either the {@link SQLERPrivateOptions}
 * passed into the {@link Manager} constructor or a property on the {@link MDBConnectionOptions} itself (in that order of precedence). For example, 
 * `connOpts.host = '127.0.0.1'` and `driverOptions.connection.host = '${host}'` would be interpolated into `driverOptions.connection.host = '127.0.0.1'`.
 * In contrast to `privOpts.username = 'someUsername' and `driverOptions.connection.user = '${username}'` would be interpolated into
 * `driverOptions.connection.user = 'someUsername'`.
 * Interpoaltions can also contain more than one reference. For example, `driverOptions.connection.someProp = '${protocol}:${host}'` for 
 * `privOpts = { protocol: 'TCP', host: 'example.com' }` would become `someProp='TCP:example.com'`.
 * @property {Object} [driverOptions.pool] The pool `conf` options that will be passed into `mariadb.createPool(conf)`. See the `mariadb` module for a full
 * listing of avialable connection pooling options.
 * __Using any of the generic `pool.someOption` will override the `conf` options set on `driverOptions.pool`__ (e.g. `pool.max = 10` would override 
 * `driverOptions.pool.connectionLimit = 20`).
 * When a value is a string surrounded by `${}`, it will be assumed to be a _constant_ property that resides on the `mariadb` module and will be interpolated
 * accordingly.
 * For example `driverOptions.pool.someProp = '${SOME_MARIADB_CONSTANT}'` will be interpolated as `pool.someProp = mariadb.SOME_MARIADB_CONSTANT`.
 * @typedef {typedefs.SQLERConnectionOptions & MDBConnectionOptionsType} MDBConnectionOptions
 */

/**
 * MariaDB + MySQL specific extension of the {@link SQLERExecOptions} from the [`sqler`](https://ugate.github.io/sqler/) module. When a property of `binds`
 * contains an object it will be _interpolated_ for property values on the `mariadb` module.
 * For example, `binds.name = '${SOME_MARIADB_CONSTANT}'` will be interpolated as
 * `binds.name = mariadb.SOME_MARIADB_CONSTANT`.
 * @typedef {Object} MDBExecDriverOptions
 * @property {String} [preparedStatementDatabase] The database name to use when generating prepared statements for the given execution. Since prepared
 * statements are scoped only for a given connection and a temporary stored procedure is used to execute prepared statements, __`preparedStatementDatabase` is
 * required when `execOpts.prepareStatement = true`.__
 * @property {Object} [exec] The options passed into execution/query functions provided by the `mariadb` module performed during {@link Manager.exec}.
 * When a value is a string surrounded by `${}`, it will be assumed to be a _constant_ property that resides on the `mariadb` module and will be interpolated
 * accordingly.
 * For example `driverOptions.exec.someDriverProp = '${SOME_MARIADB_CONSTANT}'` will be interpolated as
 * `driverOptions.exec.someDriverProp = mariadb.SOME_MARIADB_CONSTANT`.
 * @property {Boolean} [exec.namedPlaceholders=true] Truthy to use named parameters in MariaDB/MySQL or falsy to convert the named parameters into a
 * positional array of bind values.
 */

/**
 * MariaDB + MySQL specific extension of the {@link SQLERExecOptions} from the [`sqler`](https://ugate.github.io/sqler/) module. When a property of `binds`
 * contains an object it will be _interpolated_ for property values on the `mariadb` module.
 * For example, `binds.name = '${SOME_MARIADB_CONSTANT}'` will be interpolated as
 * `binds.name = mariadb.SOME_MARIADB_CONSTANT`.
 * @typedef {Object} MDBExecOptionsType
 * @property {MDBExecDriverOptions} [driverOptions] The `mariadb` module specific options.
 * @typedef {typedefs.SQLERExecOptions & MDBExecOptionsType} MDBExecOptions
 */

/**
 * Transactions are wrapped in a parent transaction object so private properties can be added (e.g. prepared statements)
 * @typedef {Object} MDBTransactionObject
 * @property {typedefs.SQLERTransaction} tx The transaction
 * @property {Object} conn The connection
 * @property {Map} unprepares Map of prepared statement names (key) and no-argument _async_ functions that will be called as a pre-operation call prior to
 * `commit` or `rollback` (value)
 */

/**
 * Metadata used inpreparation for execution.
 * @typedef {Object} ExecMeta
 * @property {MDBExecDriverOptions} dopts The formatted execution driver options.
 * @property {String} sql The formatted/bound execution SQL statement. Will also be set on `dopts.exec.sql` (when present).
 * @property {(Object | Array)} [binds] Either an object that contains the bind parameters as property names and property values as the bound values that can be
 * bound to an SQL statement or an `Array` of values format to support MySQL/MariaDB use of `?` parameter markers (non-prepared statements).
 * @property {Object} [bndp] The object version of `binds`.
 * @private
 */

/**
 * @typedef {Object} MDBPreparedStatement
 * @property {String} name The prepared statement name
 * @property {String} shortName The short name
 * @property {String} procedure The procedure name that the prepared statement will be stored as
 * @property {String} sql The originating SQL statement
 * @property {ExecMeta} execMeta The execution metadata
 * @property {String} escapedSQL The driver escaped SQL for the PS
 * @property {String[]} bnames The bind property names for the PS
 * @property {String} psql The PS SQL that stores the PS
 * @property {Promise} [procProm] The current PS promise for storing the PS
 * @property {Promise} [prepareExecProm] The promise for the initial PS stored proc to be created/executed
 * @property {Promise} [connProm] The promise for the PS connection
 * @property {Object} [conn] The PS connection
 * @property {Function} exec The `async function()` that executes the prepared statement SQL and returns the results
 * @private
 */