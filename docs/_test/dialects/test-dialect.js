'use strict';

const assert = require('node:assert/strict');
const MDBDialect = require('../../index');

/**
* Test MariaDB + MySQL database {@link Dialect}
*/
module.exports = class MDBTestDialect extends MDBDialect {

  /**
   * @inheritdoc
   */
  constructor(priv, connConf, track, errorLogger, logger, debug) {
    super(priv, connConf, track, errorLogger, logger, debug);

    assertObject(priv, 'priv');
    assertObject(connConf, 'connConf');

    assertString(connConf.username || priv.username, 'priv.username');
    assertString(connConf.id, 'connConf.id');
    assertString(connConf.name, 'connConf.name');
    assertString(connConf.dir, 'connConf.dir');
    assertString(connConf.service, 'connConf.service');
    assert.equal(connConf.dialect, 'mdb', 'connConf.dialect === mdb');

    expectDriverOptions(connConf, this);

    assertObject(track, 'track');
    if (errorLogger) assertFunction(errorLogger, 'errorLogger');
    if (logger) assertFunction(logger, 'logger');
    assertBoolean(debug, 'debug');
  }

  /**
   * @inheritdoc
   */
  async init(opts) {
    const pool = await super.init(opts);
    return pool;
  }

  /**
   * @inheritdoc
   */
  async exec(sql, opts, frags, meta, errorOpts) {
    assertString(sql, 'sql');
    assertObject(opts, 'opts');

    const state = super.state;
    assertObject(state, 'dialect.state');
    assertNumber(state.pending, 'dialect.state.pending');
    assertObject(state.connection, 'dialect.connection');
    assertNumber(state.connection.count, 'dialect.connection.count');
    assertNumber(state.connection.inUse, 'dialect.connection.inUse');

    assertObject(meta, 'meta');
    assertString(meta.name, 'meta.name');

    return super.exec(sql, opts, frags, meta, errorOpts);
  }

  /**
   * @inheritdoc
   */
  async close() {
    return super.close();
  }
};

/**
 * Expects the MariaDB + MySQL driver options (when present)
 * @param {SQLERConnectionOptions} opts The connection options to check
 * @param {MDBTestDialect} dlt The test dialect
 */
function expectDriverOptions(opts, dlt) {
  assertObject(dlt.driver, `${dlt.constructor.name} driver`);
  if (!opts.driverOptions) return;

  assertObject(opts.driverOptions, 'connConf.driverOptions');
  if (!opts.global) return;

  assertObject(opts.driverOptions.global, 'connConf.driverOptions.global');
  // assert.equal(opts.driverOptions.global.autoCommit, dlt.isAutocommit(), 'connConf.driverOptions.global.autoCommit = dlt.isAutocommit');
  for (const odb in opts.driverOptions.global) {
    assert.equal(
      opts.driverOptions.global[odb],
      dlt.driver[odb],
      `connConf.driverOptions.global.${odb} = dlt.driver.${odb}`
    );
  }
}

function assertObject(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), label);
}

function assertString(value, label) {
  assert.equal(typeof value, 'string', label);
  assert.notEqual(value.length, 0, `${label}.length`);
}

function assertFunction(value, label) {
  assert.equal(typeof value, 'function', label);
}

function assertBoolean(value, label) {
  assert.equal(typeof value, 'boolean', label);
}

function assertNumber(value, label) {
  assert.equal(typeof value, 'number', label);
}