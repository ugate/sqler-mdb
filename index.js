'use strict';

/**
 * MySQL specific extension of the {@link Manager~ConnectionOptions} from the [`sqler`](https://ugate.github.io/sqler/) module.
 * @typedef {Manager~ConnectionOptions} MySQLConnectionOptions
 * @property {Object} driverOptions The `mysql` module specific options. __Both `connection` and `pool` will be merged when generating the connection pool.__
 * @property {Object} [driverOptions.connection] An object that will contain properties/values that will be used to construct the MySQL connection
 * (e.g. `{ database: 'mysql', timezone: '-0700' }`). See the `mysql` module documentation for a full listing of available connection options.
 * When a property value is a string surrounded by `${}`, it will be assumed to be a property that resides on either the {@link Manager~PrivateOptions}
 * passed into the {@link Manager} constructor or a property on the {@link MySQLConnectionOptions} itself (in that order of precedence). For example, 
 * `connOpts.host = '127.0.0.1'` and `driverOptions.connection.host = '${host}'` would be interpolated into `driverOptions.connection.host = '127.0.0.1'`.
 * In contrast to `privOpts.username = 'someUsername' and `driverOptions.connection.user = '${username}'` would be interpolated into
 * `driverOptions.connection.user = 'someUsername'`.
 * Interpoaltions can also contain more than one reference. For example, `driverOptions.connection.someProp = '${protocol}:${host}'` for 
 * `privOpts = { protocol: 'TCP', host: 'example.com' }` would become `someProp=TCP:example.com`.
 * @property {Object} [driverOptions.pool] The pool `conf` options that will be passed into `mysql.createPool(conf)`. See the `mysql` module for a full
 * listing of avialable connection pooling options.
 * __Using any of the generic `pool.someOption` will override the `conf` options set on `driverOptions.pool`__ (e.g. `pool.max = 10` would override 
 * `driverOptions.pool.connectionLimit = 20`).
 * When a value is a string surrounded by `${}`, it will be assumed to be a _constant_ property that resides on the `mysql` module and will be interpolated
 * accordingly.
 * For example `driverOptions.pool.someProp = '${SOME_MYSQL_CONSTANT}'` will be interpolated as `pool.someProp = mysql.SOME_MYSQL_CONSTANT`.
 */

/**
 * MySQL specific extension of the {@link Manager~ExecOptions} from the [`sqler`](https://ugate.github.io/sqler/) module. When a property of `binds` contains
 * an object it will be _interpolated_ for property values on the `mysql` module.
 * For example, `binds.name = '${SOME_MYSQL_CONSTANT}'` will be interpolated as
 * `binds.name = mysql.SOME_MYSQL_CONSTANT`.
 * @typedef {Manager~ExecOptions} MySQLExecOptions
 * @property {Object} [driverOptions] The `mysql` module specific options.
 * @property {Object} [driverOptions.exec] The options passed into various `mysql` functions during {@link Manager.exec}.
 * When a value is a string surrounded by `${}`, it will be assumed to be a _constant_ property that resides on the `mysql` module and will be interpolated
 * accordingly.
 * For example `driverOptions.exec.someDriverProp = '${SOME_MYSQL_CONSTANT}'` will be interpolated as
 * `driverOptions.exec.someDriverProp = mysql.SOME_MYSQL_CONSTANT`.
 * @property {Boolean} [driverOptions.exec.namedPlaceholders=true] Truthy to use named parameters in the MySQL or falsy to convert the named parameters into a
 * positional array of bind values.
 */

/**
 * MySQL {@link Dialect} implementation for [`sqler`](https://ugate.github.io/sqler/)
 * For the time being, the [`mysql2` module](https://www.npmjs.com/package/mysql2) is used in favor of the [`mysql` module](https://www.npmjs.com/package/mysql) since
 * it supports prepared statements, default authentication for MySQL >= 8, etc.
 */
module.exports = class MySQLDialect {

  /**
   * Constructor
   * @constructs MySQLDialect
   * @param {Manager~PrivateOptions} priv The private configuration options
   * @param {MySQLConnectionOptions} connConf The individual SQL __connection__ configuration for the given dialect that was passed into the originating {@link Manager}
   * @param {Manager~Track} track Container for sharing data between {@link Dialect} instances.
   * @param {Function} [errorLogger] A function that takes one or more arguments and logs the results as an error (similar to `console.error`)
   * @param {Function} [logger] A function that takes one or more arguments and logs the results (similar to `console.log`)
   * @param {Boolean} [debug] A flag that indicates the dialect should be run in debug mode (if supported)
   */
  constructor(priv, connConf, track, errorLogger, logger, debug) {
    if (!connConf.driverOptions) throw new Error('Connection configuration is missing required driverOptions');
    const dlt = internal(this);
    dlt.at.track = track;
    dlt.at.mysql = require('mysql2');
    dlt.at.connections = {};
    dlt.at.opts = {
      autoCommit: true, // default autoCommit = true to conform to sqler
      id: `sqlerMySQLGen${Math.floor(Math.random() * 10000)}`,
      connection: connConf.driverOptions.connection ? dlt.at.track.interpolate({}, connConf.driverOptions.connection, dlt.at.mysql) : {}
    };
    // merge connection options into pool options
    dlt.at.opts.pool = connConf.driverOptions.pool ? 
      dlt.at.track.interpolate(dlt.at.opts.connection, connConf.driverOptions.pool, dlt.at.mysql) : 
      dlt.at.opts.connection;
    dlt.at.state = {
      pending: 0,
      connection: { count: 0, inUse: 0 }
    };

    dlt.at.errorLogger = errorLogger;
    dlt.at.logger = logger;
    dlt.at.debug = debug;

    if (priv.host) dlt.at.opts.pool.host = priv.host;
    if (priv.port) dlt.at.opts.pool.port = priv.port;
    dlt.at.opts.pool.user = priv.username;
    dlt.at.opts.pool.password = priv.password;

    //dlt.at.opts.pool.initialSize = connConf.pool ? connConf.pool.min : null;
    dlt.at.opts.pool.connectionLimit = connConf.pool ? connConf.pool.max : null;
    // TODO : mysql module only: dlt.at.opts.pool.connectionTimeout = connConf.pool ? connConf.pool.idle : null;
    //dlt.at.opts.pool.incrementSize = connConf.pool ? connConf.pool.increment : null;
    // TODO : mysql module only: dlt.at.opts.pool.acquireTimeout = connConf.pool ? connConf.pool.timeout : null;
  }

  /**
   * Initializes {@link MySQLDialect} by creating the connection pool
   * @param {Dialect~DialectInitOptions} opts The options described by the `sqler` module
   * @returns {Object} The MySQL connection pool
   */
  async init(opts) {
    const dlt = internal(this), numSql = opts.numOfPreparedStmts;
    try {
      dlt.at.pool = dlt.at.mysql.createPool(dlt.at.opts.pool);
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mysql: Connection pool "${dlt.at.opts.id}" created with (${numSql} SQL files) ` +
          `acquireTimeout=${dlt.at.opts.pool.acquireTimeout} connectionTimeout=${dlt.at.opts.pool.connectionTimeout} ` +
          `connectionLimit=${dlt.at.opts.pool.connectionLimit}`);
      }
      return dlt.at.pool;
    } catch (err) {
      const msg = `sqler-mysql: connection pool "${dlt.at.opts.id}" could not be created`;
      if (dlt.at.errorLogger) dlt.at.errorLogger(`${msg} (passwords are omitted from error) ${JSON.stringify(err, null, ' ')}`);
      const pconf = Object.assign({}, dlt.at.opts.pool);
      delete pconf.password;
      err.message = `${err.message}\n${msg} for ${JSON.stringify(pconf, null, ' ')}`;
      err.sqlerMysql = pconf;
      throw err;
    }
  }

  /**
   * Begins a transaction by opening a connection from the pool
   * @param {String} txId The transaction ID that will be started
   */
  async beginTransaction(txId) {
    const dlt = internal(this);
    if (dlt.at.connections[txId]) return;
    if (dlt.at.logger) {
      dlt.at.logger(`sqler-mysql: Beginning transaction "${txId}" on connection pool "${dlt.at.opts.id}"`);
    }
    dlt.at.connections[txId] = await dlt.this.getConnection({ transactionId: txId });
    return new Promise((resolve, reject) => {
      dlt.at.connections[txId].beginTransaction(err => {
        if (err) {
          delete dlt.at.connections[txId];
          reject(err);
        } else resolve();
      });
    });
  }

  /**
   * Executes a SQL statement
   * @param {String} sql the SQL to execute
   * @param {MySQLExecOptions} opts The execution options
   * @param {String[]} frags the frament keys within the SQL that will be retained
   * @param {(Manager~ExecErrorOptions | Boolean)} [errorOpts] The error options to use
   * @returns {Dialect~ExecResults} The execution results
   */
  async exec(sql, opts, frags, errorOpts) {
    const dlt = internal(this);
    let conn, bndp = {}, rslts, esql, ebndp;
    try {
      // interpolate and remove unused binds since
      // MySQL only accepts the exact number of bind parameters (also, cuts down on payload bloat)
      bndp = dlt.at.track.interpolate(bndp, opts.binds, dlt.at.mysql, props => sql.includes(`:${props[0]}`));

      // default
      const dopts = opts.driverOptions || {};
      if (!dopts.exec || !dopts.exec.hasOwnProperty('namedPlaceholders') || dopts.exec.namedPlaceholders) {
        if (!dopts.exec) dopts.exec = {};
        dopts.exec.namedPlaceholders = true;
        esql = sql;
      } else {
        esql = dlt.at.track.positionalBinds(sql, bndp, ebndp = []);
      }

      // always use connection.execute rather than pool.query since connections allow options to be passed
      const conn = await dlt.this.getConnection(opts);
      // copy the connection config from pool so they can be edited without impacting other connections
      conn.config = Object.assign({}, conn.config);
      // override any connection config with the config from exec
      Object.assign(conn.config, dopts.exec);

      rslts = await new Promise((resolve, reject) => {
        conn.execute(esql, ebndp || bndp, (err, rows, fields) => {
          if (err) reject(err);
          else resolve({ rows, fields });
        });
      });
      conn.unprepare(esql);

      const rtn = {
        rows: rslts.rows,
        raw: rslts
      };

      if (opts.autoCommit) {
        // MySQL has no option to autocommit during SQL execution
        await operation(dlt, 'commit', false, conn, opts)();
        await operation(dlt, 'close', true, conn, opts)();
      } else {
        dlt.at.state.pending++;
        rtn.commit = operation(dlt, 'commit', true, conn, opts);
        rtn.rollback = operation(dlt, 'rollback', true, conn, opts);
      }
      return rtn;
    } catch (err) {
      if (conn) {
        try {
          await operation(dlt, 'close', false, conn, opts)();
        } catch (cerr) {
          err.closeError = cerr;
        }
      }
      const msg = ` (BINDS: [${Object.keys(bndp)}], FRAGS: ${Array.isArray(frags) ? frags.join(', ') : frags})`;
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`Failed to execute the following SQL: ${sql}`, err);
      }
      err.message += msg;
      throw err;
    }
  }

  /**
   * Gets the currently open connection or a new connection when no transaction is in progress
   * @protected
   * @param {MySQLExecOptions} opts The execution options
   * @returns {Object} The connection (when present)
   */
  async getConnection(opts) {
    const dlt = internal(this);
    const txId = opts.transactionId;
    let conn = txId ? dlt.at.connections[txId] : null;
    if (!conn) {
      return new Promise((resolve, reject) => {
        dlt.at.pool.getConnection((err, mconn) => err ? reject(err) : resolve(mconn));
      });
    }
    return conn;
  }

  /**
   * Closes the MySQL connection pool
   * @returns {Integer} The number of connections closed
   */
  async close() {
    const dlt = internal(this);
    try {
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mysql: Closing connection pool "${dlt.at.opts.id}" (uncommitted transactions: ${dlt.at.state.pending})`);
      }
      if (dlt.at.pool) {
        await new Promise((resolve, reject) => {
          dlt.at.pool.end(err => err ? reject(err) : resolve());
        });
      }
      return dlt.at.state.pending;
    } catch (err) {
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`sqler-mysql: Failed to close connection pool "${dlt.at.opts.id}" (uncommitted transactions: ${dlt.at.state.pending})`, err);
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
   * @returns {Object} The MySQL driver module
   */
  get driver() {
    return internal(this).at.mysql;
  }
};

/**
 * Executes a function by name that resides on the MySQL connection
 * @private
 * @param {Object} dlt The internal MySQL object instance
 * @param {String} name The name of the function that will be called on the connection
 * @param {Boolean} reset Truthy to reset the pending connection and transaction count when the operation completes successfully
 * @param {Object} conn The connection
 * @param {Manager~ExecOptions} [opts] The {@link Manager~ExecOptions}
 * @returns {Function} A no-arguement `async` function that returns the number or pending transactions
 */
function operation(dlt, name, reset, conn, opts) {
  return async () => {
    let error;
    try {
      if (dlt.at.logger) {
        dlt.at.logger(`sqler-mysql: Performing ${name} on connection pool "${dlt.at.opts.id}" (uncommitted transactions: ${dlt.at.state.pending})`);
      }
      await new Promise((resolve, reject) => {
        conn[name](err => err ? reject(err) : resolve());
      });
      if (reset) {
        if (opts && opts.transactionId) delete dlt.at.connections[opts.transactionId];
        dlt.at.state.pending = 0;
      }
    } catch (err) {
      error = err;
      if (dlt.at.errorLogger) {
        dlt.at.errorLogger(`sqler-mysql: Failed to ${name} ${dlt.at.state.pending} transaction(s) with options: ${
          opts ? JSON.stringify(opts) : 'N/A'}`, error);
      }
      throw error;
    } finally {
      if (name !== 'close') {
        try {
          await new Promise((resolve, reject) => {
            conn.close(err => err ? reject(err) : resolve());
          });
        } catch (cerr) {
          if (error) {
            error.sqlerMysql = {
              closeError: cerr
            };
          }
        }
      }
    }
    return dlt.at.state.pending;
  };
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