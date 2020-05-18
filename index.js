'use strict';

const MAX_MDB_NAME_LGTH = 64;

/**
 * MariaDB + MySQL specific extension of the {@link Manager~ConnectionOptions} from the [`sqler`](https://ugate.github.io/sqler/) module.
 * @typedef {Manager~ConnectionOptions} MDBConnectionOptions
 * @property {Object} driverOptions The `mariadb` (w/MySQL support) module specific options. __Both `connection` and `pool` will be merged when generating
 * the connection pool.__
 * @property {Object} [driverOptions.connection] An object that will contain properties/values that will be used to construct the MariaDB + MySQL connection
 * (e.g. `{ database: 'mydb', timezone: '-0700' }`). See the `mariadb` module documentation for a full listing of available connection options.
 * When a property value is a string surrounded by `${}`, it will be assumed to be a property that resides on either the {@link Manager~PrivateOptions}
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
 */

/**
 * MariaDB + MySQL specific extension of the {@link Manager~ExecOptions} from the [`sqler`](https://ugate.github.io/sqler/) module. When a property of `binds`
 * contains an object it will be _interpolated_ for property values on the `mariadb` module.
 * For example, `binds.name = '${SOME_MARIADB_CONSTANT}'` will be interpolated as
 * `binds.name = mariadb.SOME_MARIADB_CONSTANT`.
 * @typedef {Manager~ExecOptions} MDBExecOptions
 * @property {Object} [driverOptions] The `mariadb` module specific options.
 * @property {String} [driverOptions.preparedStatementDatabase] The database name to use when generating prepared statements for the given execution. Since prepared
 * statements are scoped only for a given connection and a temporary stored procedure is used to execute prepared statements, __`preparedStatementDatabase` is
 * required when `execOpts.prepareStatement = true`.__
 * @property {Object} [driverOptions.exec] The options passed into execution/query functions provided by the `mariadb` module performed during {@link Manager.exec}.
 * When a value is a string surrounded by `${}`, it will be assumed to be a _constant_ property that resides on the `mariadb` module and will be interpolated
 * accordingly.
 * For example `driverOptions.exec.someDriverProp = '${SOME_MARIADB_CONSTANT}'` will be interpolated as
 * `driverOptions.exec.someDriverProp = mariadb.SOME_MARIADB_CONSTANT`.
 * @property {Boolean} [driverOptions.exec.namedPlaceholders=true] Truthy to use named parameters in MariaDB/MySQL or falsy to convert the named parameters into a
 * positional array of bind values.
 */

/**
 * MariaDB + MySQL {@link Dialect} implementation for [`sqler`](https://ugate.github.io/sqler/)
 */
module.exports = class MDBDialect {

  /**
   * Constructor
   * @constructs MDBDialect
   * @param {Manager~PrivateOptions} priv The private configuration options
   * @param {MDBConnectionOptions} connConf The individual SQL __connection__ configuration for the given dialect that was passed into the originating {@link Manager}
   * @param {Manager~Track} track Container for sharing data between {@link Dialect} instances.
   * @param {Function} [errorLogger] A function that takes one or more arguments and logs the results as an error (similar to `console.error`)
   * @param {Function} [logger] A function that takes one or more arguments and logs the results (similar to `console.log`)
   * @param {Boolean} [debug] A flag that indicates the dialect should be run in debug mode (if supported)
   */
  constructor(priv, connConf, track, errorLogger, logger, debug) {
    if (!connConf.driverOptions) throw new Error('Connection configuration is missing required driverOptions');
    const dlt = internal(this);
    dlt.at.track = track;
    dlt.at.driver = require('mariadb');
    dlt.at.connections = new Map();
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
   * @param {Dialect~DialectInitOptions} opts The options described by the `sqler` module
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
        try {
          await conn.release();
        } catch (cerr) {
          if (error) error.closeError = cerr;
        }
      }
    }
  }

  /**
   * Begins a transaction by opening a connection from the pool
   * @param {String} txId The transaction ID that will be started
   */
  async beginTransaction(txId) {
    const dlt = internal(this);
    if (dlt.at.connections.has(txId)) return;
    if (dlt.at.logger) {
      dlt.at.logger(`sqler-mdb: Beginning transaction "${txId}" on connection pool "${dlt.at.opts.id}"`);
    }
    const conn = await dlt.this.getConnection({ transactionId: txId });
    dlt.at.connections.set(txId, conn);
    return conn.beginTransaction();
  }

  /**
   * Executes a SQL statement
   * @param {String} sql the SQL to execute
   * @param {MDBExecOptions} opts The execution options
   * @param {String[]} frags the frament keys within the SQL that will be retained
   * @param {Manager~ExecMeta} meta The SQL execution metadata
   * @param {(Manager~ExecErrorOptions | Boolean)} [errorOpts] The error options to use
   * @returns {Dialect~ExecResults} The execution results
   */
  async exec(sql, opts, frags, meta, errorOpts) {
    const dlt = internal(this);
    let conn, bndp = {}, dopts, rslts, esql, ebndp, error, pso;
    try {
      // interpolate and remove unused binds since
      // MariaDB/MySQL only accepts the exact number of bind parameters (also, cuts down on payload bloat)
      bndp = dlt.at.track.interpolate(bndp, opts.binds, dlt.at.driver, props => sql.includes(`:${props[0]}`));

      // driver options exec override the 
      dopts = opts.driverOptions || {};
      const named = dopts.exec && dopts.exec.hasOwnProperty('namedPlaceholders') ? dopts.exec.namedPlaceholders :
        dlt.at.opts.pool.namedPlaceholders;
      if (opts.prepareStatement) { // prepared statements always use named parameter markers
        if (!dopts.preparedStatementDatabase) {
          throw new Error('A valid database name must be provided using "execOpts.driverOptions.preparedStatementDatabase" ' +
            'when "execOpts.prepareStatement = true"');
        }
        esql = dlt.at.track.positionalBinds(sql, bndp, [], pname => `@${pname}`);
      } else { // use "?" parameter markers
        esql = named ? sql : dlt.at.track.positionalBinds(sql, bndp, ebndp = []);
      }
      if (dopts.exec) dopts.exec.sql = esql;

      let isPrepare, psname;
      if (opts.prepareStatement) {
        psname = meta.name.length > MAX_MDB_NAME_LGTH ? `sqler_stmt_${Math.floor(Math.random() * 100000)}` : meta.name;
        if (dlt.at.stmts.has(psname)) {
          pso = dlt.at.stmts.get(psname);
          conn = pso.conn;
        } else {
          isPrepare = true;
          pso = { sql: esql };
          // set before async in case concurrent PS invocations
          dlt.at.stmts.set(psname, pso);
          pso.connProm = dlt.this.getConnection(opts);  // other PS exec need access to promise in order to wait for connection access
          pso.conn = conn = await pso.connProm; // wait for the initial PS to establish a connection (other PS exec need access to promise)
          pso.connProm = null; // reset promise once it completes
        }
      }

      const rtn = {};

      if (!opts.transactionId && !opts.prepareStatement && opts.type === 'READ') {
        rslts = await dlt.at.pool.query(dopts.exec || esql, ebndp || bndp);
        rtn.rows = rslts;
      } else {
        if (opts.prepareStatement) {
          rtn.unprepare = async () => {
            if (dlt.at.stmts.has(psname)) {
              const pso = dlt.at.stmts.get(psname);
              try {
                await pso.conn.query(`DEALLOCATE PREPARE ${pso.name}`);
                dlt.at.stmts.delete(psname);
                // need to drop separately since drop procedure cannot be done from within a procedure
                await pso.conn.query(`DROP PROCEDURE ${pso.procedure}`);
              } finally {
                if (!opts.transactionId) await pso.conn.release();
              }
            } else if (!opts.transactionId) await conn.release();
          };
          if (isPrepare) {
            pso.name = psname;
            pso.procedure = `\`${dopts.preparedStatementDatabase}\`.\`${psname}_stmt\``;
            if (pso.procedure.length > MAX_MDB_NAME_LGTH) pso.procedure = `${psname}_proc`;
            pso.escapedSQL = conn.escape(esql); // esql.replace(/([^'\\]*(?:\\.[^'\\]*)*)'/g, "$1\\'");
            pso.bnames = Object.getOwnPropertyNames(bndp);
            pso.psql = preparedStmtProc(pso);
            pso.procProm = conn.query(pso.psql); // prepare/exec PS (other exec need access to wait for proc to be created)
            await pso.procProm; // wait for the PS stored proc to be created
            pso.prepareExecProm = preparedStmtProcExec(pso, conn, bndp, true);  // wait for the initial PS stored proc to be created/executed
            pso.procProm = pso.prepareExecProm = null; // reset promises once they completed
          } else {
            pso = dlt.at.stmts.get(psname);
            if (pso.connProm) await pso.connProm; // wait for the initial PS to establish a connection
            if (pso.procProm) await pso.procProm; // wait for the initial PS stored proc to be created
            if (pso.prepareExecProm) await pso.prepareExecProm; // wait for the initial PS to be prepared
            conn = pso.conn;
            rslts = await preparedStmtProcExec(pso, conn, bndp);
          }
          rtn.rows = rslts;
        } else {
          conn = await dlt.this.getConnection(opts);
          rslts = await conn.query(dopts.exec || esql, ebndp || bndp);
          rtn.rows = rslts;
        }
        if (opts.transactionId) {
          if (opts.autoCommit) {
            // MariaDB/MySQL has no option to autocommit during SQL execution
            await operation(dlt, 'commit', false, conn, opts, rtn.unprepare)();
          } else {
            dlt.at.state.pending++;
            rtn.commit = operation(dlt, 'commit', true, conn, opts, rtn.unprepare);
            rtn.rollback = operation(dlt, 'rollback', true, conn, opts, rtn.unprepare);
          }
        }
      }
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
      if (conn && !opts.transactionId && !opts.prepareStatement) {
        try {
          await operation(dlt, 'release', false, conn, opts)();
        } catch (cerr) {
          if (error) error.closeError = cerr;
        }
      }
    }
  }

  /**
   * Gets the currently open connection or a new connection when no transaction is in progress
   * @protected
   * @param {MDBExecOptions} opts The execution options
   * @returns {Object} The connection (when present)
   */
  async getConnection(opts) {
    const dlt = internal(this);
    const txId = opts.transactionId;
    let conn = txId ? dlt.at.connections.get(txId) : null;
    if (!conn) {
      return dlt.at.pool.getConnection();
    }
    return conn;
  }

  /**
   * Closes the MariaDB/MySQL connection pool
   * @returns {Integer} The number of connections closed
   */
  async close() {
    const dlt = internal(this);
    try {
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mdb: Closing connection pool "${dlt.at.opts.id}" (uncommitted transactions: ${dlt.at.state.pending})`);
      }
      if (dlt.at.pool) {
        await dlt.at.pool.end();
        dlt.at.connections.clear();
      }
      return dlt.at.state.pending;
    } catch (err) {
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`sqler-mdb: Failed to close connection pool "${dlt.at.opts.id}" (uncommitted transactions: ${dlt.at.state.pending})`, err);
      }
      throw err;
    }
  }

  /**
   * @returns {Manager~State} The state
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
};

/**
 * Executes a function by name that resides on the MariaDB/MySQL connection
 * @private
 * @param {Object} dlt The internal MariaDB/MySQL object instance
 * @param {String} name The name of the function that will be called on the connection
 * @param {Boolean} reset Truthy to reset the pending connection and transaction count when the operation completes successfully
 * @param {Object} conn The connection
 * @param {Manager~ExecOptions} [opts] The {@link Manager~ExecOptions}
 * @param {Function} [preop] A no-argument async function that will be executed prior to the operation
 * @returns {Function} A no-arguement `async` function that returns the number or pending transactions
 */
function operation(dlt, name, reset, conn, opts, preop) {
  return async () => {
    let error;
    if (preop) await preop();
    try {
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mdb: Performing ${name} on connection pool "${dlt.at.opts.id}" (uncommitted transactions: ${dlt.at.state.pending})`);
      }
      await conn[name]();
      if (reset) { // not to be confused with mariadb connection.reset();
        if (opts && opts.transactionId) dlt.at.connections.delete(opts.transactionId);
        dlt.at.state.pending = 0;
      }
    } catch (err) {
      error = err;
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`sqler-mdb: Failed to ${name} ${dlt.at.state.pending} transaction(s) with options: ${
          opts ? JSON.stringify(opts) : 'N/A'}`, error);
      }
      throw error;
    } finally {
      if (name !== 'end' && name !== 'release') {
        try {
          await conn.release();
        } catch (cerr) {
          if (error) {
            error.closeError = cerr;
          }
        }
      }
    }
    return dlt.at.state.pending;
  };
}

/**
 * Generates a stored procedure that accepts an _operation name_ and a JSON data type.
 * The operation name can be one of the following:
 * - `prepare` - Prepares the statement
 * - `execute` - Executes the statement using the passed JSON
 * - `prepare_execute` - Prepares and executes the statement using the passed JSON
 * @private
 * @param {Object} pso The prepared statement object that will be used to generate the stored procedure
 * @returns {String} The stored procedure for the prepared statement
 */
function preparedStmtProc(pso) {
  return `CREATE PROCEDURE ${pso.procedure}(IN oper VARCHAR(15), IN vars JSON)
      BEGIN
        IF (oper = 'prepare' OR oper = 'prepare_execute') THEN
          PREPARE ${pso.name} FROM ${pso.escapedSQL};
        END IF;
        IF (oper = 'execute' OR oper = 'prepare_execute') THEN 
          ${ pso.bnames.length ? pso.bnames.map(nm => `
            SET @${nm} := JSON_UNQUOTE(JSON_EXTRACT(vars, '$.${nm}'));`).join('') : ''
          }
          EXECUTE ${pso.name};
        END IF;
      END;
    `;
}

/**
 * Calls a prepared statement stored procedure execution 
 * @private
 * @param {Object} pso The prepared statement object that will be used to generate the stored procedure
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

// private mapping
let map = new WeakMap();
let internal = function(object) {
  if (!map.has(object)) {
    map.set(object, {});
  }
  return {
    at: map.get(object),
    this: object
  };
};