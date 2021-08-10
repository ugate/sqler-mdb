'use strict';

// TODO : ESM comment the following lines...
const { Labrat, LOGGER } = require('@ugate/labrat');
const { Manager } = require('sqler');
const Path = require('path');
const Fs = require('fs');
const Os = require('os');
const { expect } = require('@hapi/code');
const readChunk = require('read-chunk');
const imageType = require('image-type');
// TODO : import { Labrat, LOGGER } from '@ugate/labrat';
// TODO : import { Manager } from 'sqler.mjs';
// TODO : import * as Fs from 'fs';
// TODO : import * as Os from 'os';
// TODO : import { expect } from '@hapi/code';
// TODO : import { readChunkSync } from 'read-chunk'; // version >= 4.0.0
// TODO : import * as imageType from 'imageType';

const CONF_SUFFIX_VAR = 'SQLER_CONF_FILE_SUFFIX';
const test = {
  mgr: null,
  cache: null,
  rowCount: 2,
  mgrLogit: !!LOGGER.info,
  vendor: 'mdb',
  defaultPort: 3306,
  conf: {}
};

// TODO : ESM uncomment the following line...
// export
class Tester {

  /**
   * Create table(s) used for testing
   */
  static async before() {
    test.suffix = CONF_SUFFIX_VAR in process.env;
    Labrat.header(`${test.vendor}: Creating test tables (if any)${test.suffix ? ` ${CONF_SUFFIX_VAR}=${test.suffix}` : ''}`);
    
    const conf = getConf();
    test.cache = null;
    test.mgr = new Manager(conf, test.cache, test.mgrLogit || generateTestAbyssLogger);
    await test.mgr.init();
    
    if (test.mgr.db[test.vendor].setup) {
      const createDB = getCrudOp('create', test.vendor, 'database');
      await createDB(test.mgr, test.vendor);
      const createT1 = getCrudOp('create', test.vendor, 'table1');
      await createT1(test.mgr, test.vendor);
      const createT2 = getCrudOp('create', test.vendor, 'table2');
      await createT2(test.mgr, test.vendor);
    }
    test.created = true;
  }

  /**
   * Drop table(s) used for testing
   */
  static async after() {
    if (!test.created) {
      Labrat.header(`${test.vendor}: Skipping dropping of test tables/database`);
      return;
    }
    Labrat.header(`${test.vendor}: Dropping test tables/database (if any)`);
    
    const conf = getConf();
    test.cache = null;
    if (!test.mgr) {
      test.mgr = new Manager(conf, test.cache, test.mgrLogit || generateTestAbyssLogger);
      await test.mgr.init();
    }
    
    try {
      if (test.mgr.db[test.vendor].setup) {
        const deleteDB = getCrudOp('delete', test.vendor, 'database');
        await deleteDB(test.mgr, test.vendor);
      }
      test.created = false;
    } catch (err) {
      if (LOGGER.warn) LOGGER.warn(`${test.vendor}: Failed to delete tables/database${test.suffix ? ` (${CONF_SUFFIX_VAR}=${test.suffix})` : ''}`, err);
      throw err;
    }
    return test.mgr.close();
  }

  /**
   * Start cache (if present)
   */
  static async beforeEach() {
    const cch = test.cache;
    test.cache = null;
    if (cch && cch.start) await cch.start();
  }

  /**
   * Stop cache (if present)
   */
  static async afterEach() {
    const cch = test.cache;
    test.cache = null;
    if (cch && cch.stop) await cch.stop();
  }

  //======================== Executions ========================

  /**
   * Test CRUD operations for a specified `priv.vendor` and `priv.mgr`
   */
  static async crud() {
    Labrat.header(`${test.vendor}: Running CRUD tests`, 'info');
    const rslts = new Array(3);
    let rslti = -1, lastUpdated;

    // expect CRUD results
    const crudly = async (rslt, label, nameIncl, count = 2) => {
      if (!rslt.rows) return;
      expect(rslt.rows, `CRUD ${label} rows`).array();
      if (!label.includes('read')) return;
      expect(rslt.rows, `CRUD ${label} rows.length`).length(count);
      let updated;
      for (let row of rslt.rows) {
        expect(row, `CRUD ${label} row`).object();
        if (nameIncl) expect(row.name, `CRUD ${label} row.name`).includes(nameIncl);
        updated = row.updated;
        expect(updated, `CRUD ${label} row.updated`).date();
        if (lastUpdated) expect(updated, `CRUD ${label} row.updated > lastUpdated`).greaterThan(lastUpdated);
        // expect binary report image
        if (row.report) {
          expect(row.report, 'row.report').to.be.buffer();
          if (row.reportPath) {
            const reportBuffer = readChunk.sync(row.reportPath, 0, 12);
            const reportType = imageType(reportBuffer);
            expect(reportType, 'row.report Image Type').to.be.object();
            expect(reportType.mime, 'row.report Image Mime-Type').to.equal('image/png');
          }
        }
      }
      lastUpdated = updated;
    };

    const create = getCrudOp('create', test.vendor);
    rslts[++rslti] = await create(test.mgr, test.vendor);
    crudly(rslts[rslti], 'create');

    const read = getCrudOp('read', test.vendor);
    rslts[++rslti] = await read(test.mgr, test.vendor);
    crudly(rslts[rslti], 'read', 'TABLE');

    const update = getCrudOp('update', test.vendor);
    rslts[++rslti] = await update(test.mgr, test.vendor);
    crudly(rslts[rslti], 'update');

    rslts[++rslti] = await read(test.mgr, test.vendor);
    crudly(rslts[rslti], 'update read', 'UPDATE');

    // extra update to test procedure
    await test.mgr.db[test.vendor].update.table.rows({
      binds: {
        id: 1, name: 'TABLE: 1, ROW: 1 (UPDATE)', updated: new Date(),
        id2: 1, name2: 'TABLE: 2, ROW: 1 (UPDATE)', updated2: new Date()
      }
    });

    const del = getCrudOp('delete', test.vendor);
    rslts[++rslti] = await del(test.mgr, test.vendor);
    crudly(rslts[rslti], 'delete');

    rslts[++rslti] = await read(test.mgr, test.vendor);
    crudly(rslts[rslti], 'delete read', null, 0);

    if (LOGGER.debug) LOGGER.debug(`CRUD ${test.vendor} execution results:`, ...rslts);
    Labrat.header(`${test.vendor}: Completed CRUD tests`, 'info');
    return rslts;
  }

  static async execDriverOptionsAlt() {
    const reader = test.mgr.db[test.vendor].read.table.rows({
      binds: { name: 'table' },
      driverOptions: {
        exec: {
          namedPlaceholders: false
        }
      }
    });
    const deleter = test.mgr.db[test.vendor].delete.table.rows({
      binds: { id: 500, id2: 500 },
      driverOptions: {
        exec: {
          namedPlaceholders: false
        }
      }
    });
    return Promise.all([reader, deleter]);
  }

  static async sqlInvalidThrow() {
    return test.mgr.db[test.vendor].error.update.non.exist({}, ['error']);
  }

  static async bindsInvalidThrow() {
    const date = datify();
    return test.mgr.db[test.vendor].create.table.rows({
      binds: {
        id: 500, name: 'SHOULD NEVER GET INSERTED', created: date, updated: date,
        id2: 500, name2: 'SHOULD NEVER GET INSERTED', /* report2 missing should throw error */ created2: date, updated2: date
      }
    });
  }

  static async preparedStatementInvalidThrow() {
    const date = datify();
    return test.mgr.db[test.vendor].create.table.rows({
      prepareStatement: true,
      binds: {
        id: 500, name: 'SHOULD NEVER GET INSERTED', created: date, updated: date,
        id2: 500, name2: 'SHOULD NEVER GET INSERTED', report2: Buffer.from('INVALID'), created2: date, updated2: date
      }
    });
  }

  //====================== Configurations ======================

  static async initThrow() {
    // need to set a conf override to prevent overwritting of privateConf.username
    const conf = getConf({
      pool: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        conn[prop].timeout = 1000; // should have timout less than test timeout
      }
    });
    conf.univ.db[test.vendor].username = 'invalid';
    conf.univ.db[test.vendor].password = 'invalid';
    const mgr = new Manager(conf, test.cache, test.mgrLogit || generateTestAbyssLogger);
    await mgr.init();
    return mgr.close();
  }

  static async poolNone() {
    const conf = getConf({ pool: null, connection: null });
    const mgr = new Manager(conf, test.cache, test.mgrLogit || generateTestAbyssLogger);
    await mgr.init();
    return mgr.close();
  }

  static async poolPropSwap() {
    const conf = getConf({
      pool: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        if (conn[prop].hasOwnProperty('max')) {
          delete conn[prop].max;
        } else {
          conn[prop].max = 10;
        }
        if (conn[prop].hasOwnProperty('min')) {
          delete conn[prop].min;
        } else {
          conn[prop].min = conn[prop].hasOwnProperty('max') ? conn[prop].max : 10;
        }
        if (conn[prop].hasOwnProperty('idle')) {
          delete conn[prop].idle;
        } else {
          conn[prop].idle = 1800;
        }
        if (conn[prop].hasOwnProperty('timeout')) {
          delete conn[prop].timeout;
        } else {
          conn[prop].timeout = 10000;
        }
      }
    });
    const mgr = new Manager(conf, test.cache, test.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async driverOptionsNoneThrow() {
    const conf = getConf({ driverOptions: null });
    const mgr = new Manager(conf, test.cache, test.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async driverOptionsPoolConnNone() {
    const conf = getConf({
      driverOptions: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        conn[prop].pool = null;
        conn[prop].connection = null;
      }
    });
    const mgr = new Manager(conf, test.cache, test.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async driverOptionsPoolConnSwap() {
    const conf = getConf({
      driverOptions: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        if (conn[prop].pool && !conn[prop].connection) {
          conn[prop].connection = conn[prop].pool;
          conn[prop].pool = null;
        } else if (!conn[prop].pool && conn[prop].connection) {
          conn[prop].pool = conn[prop].connection;
          conn[prop].connection = null;
        } else {
          conn[prop].pool = {};
          conn[prop].connection = {};
        }
      }
    });
    const mgr = new Manager(conf, test.cache, test.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async driverOptionsNamedPlaceholdersSwap() {
    const conf = getConf({
      driverOptions: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        const cont = conn[prop].pool || conn[prop].connection || {};
        cont.namedPlaceholders = !cont.namedPlaceholders;
      }
    });
    const mgr = new Manager(conf, test.cache, test.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async hostPortSwap() {
    // need to set a conf override to prevent overwritting of privateConf properties for other tests
    const conf = getConf({ pool: null }), realConf = getConf();
    if (conf.univ.db[test.vendor].host) {
      //delete conf.univ.db[test.vendor].host;
      conf.univ.db[test.vendor].host = 'sqler_mdb_database'; // need to use alias hostname from docker "links"
    } else {
      conf.univ.db[test.vendor].host = realConf.univ.db[test.vendor].host;
    }
    if (conf.univ.db[test.vendor].hasOwnProperty('port')) {
      delete conf.univ.db[test.vendor].port;
    } else {
      conf.univ.db[test.vendor].port = test.defaultPort;
    }
    const mgr = new Manager(conf, test.cache, test.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async multipleConnections() {
    const conf = getConf({} /*pass obj so conf is copy*/);
    const conn = JSON.parse(JSON.stringify(conf.db.connections[0]));
    conn.name += '2';
    conf.db.connections.push(conn);
    const mgr = new Manager(conf, test.cache, test.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async closeBeforeInit() {
    const conf = getConf();
    const mgr = new Manager(conf, test.cache, test.mgrLogit || generateTestAbyssLogger);
    return mgr.close();
  }
}

// TODO : ESM comment the following line...
module.exports = Tester;

/**
 * Generates a configuration
 * @param {Object} [overrides] The connection configuration override properties. Each property will be deleted from the returned
 * connection configuration when falsy. When the property value is an function, the `function(propertyName, connectionConf)` will
 * be called (property not set by the callee). Otherwise, the property value will be set on the configuration.
 * @returns {Object} The configuration
 */
function getConf(overrides) {
  let conf = test.conf[test.vendor];
  if (!conf) {
    conf = test.conf[test.vendor] = JSON.parse(Fs.readFileSync(Path.join(`test/fixtures/${test.vendor}`, `conf${test.suffix || ''}.json`), 'utf8'));
    if (!test.univ) {
      test.univ = JSON.parse(Fs.readFileSync(Path.join('test/fixtures', `priv${test.suffix || ''}.json`), 'utf8')).univ;
    }
    conf.univ = test.univ;
    conf.mainPath = 'test';
    conf.db.dialects.mdb = './test/dialects/test-dialect.js';
    if (!conf.univ.db.mdb.host || conf.univ.db.mdb.host === 'localhost' || conf.univ.db.mdb.host === '127.0.0.1') {
      if (process.env.SQLER_TEST_NO_PASSWORD) {
        //if (!conf.univ.db.mdb.host) conf.univ.db.mdb.host = Os.hostname();
        // NOTE : For simplicity, tests for localhost require a user to be setup w/o a password
        delete conf.univ.db.mdb.password;
      }
    }
  }
  if (overrides) {
    const confCopy = JSON.parse(JSON.stringify(conf));
    for (let dlct in conf.db.dialects) {
      confCopy.db.dialects[dlct] = conf.db.dialects[dlct];
    }
    conf = confCopy;
  }
  let exclude;
  for (let conn of conf.db.connections) {
    for (let prop in conn) {
      if (!conn.hasOwnProperty(prop)) continue;
      exclude = overrides && overrides.hasOwnProperty(prop);
      if (exclude) {
        if (typeof overrides[prop] === 'function') overrides[prop](prop, conn);
        else if (overrides[prop]) conn[prop] = overrides[prop];
        else delete conn[prop];
      } else if (prop === 'pool') {
        conn.pool.min = Math.floor((process.env.UV_THREADPOOL_SIZE - 1) / 2) || 2;
        conn.pool.max = process.env.UV_THREADPOOL_SIZE ? process.env.UV_THREADPOOL_SIZE - 1 : conn.pool.min;
        conn.pool.increment = 1;
        if (!overrides) return conf; // no need to continue since there are no more options that need to be set manually
      }
    }
  }
  return conf;
}

/**
 * Gets the `async function` that will execute a CRUD operation
 * @param {String} name The name of the CRUD operation (e.g. `create`, `read`, etc.)
 * @param {String} vendor The vendor to use (e.g. `oracle`, `mssql`, etc.)
 * @param {String} [setupKey] Truty when the CRUD operation is for a setup operation (e.g. creating/dropping tables)
 * @returns {Function} The `async function(manager)` that will return the CRUD results
 */
function getCrudOp(name, vendor, setupKey) {
  const base = Path.join(process.cwd(), `test/lib/${vendor}${setupKey ? '/setup' : ''}`);
  const pth = Path.join(base, `${name}.${setupKey || 'table.rows'}.js`);
  return require(pth);
}

/**
 * Generate a test logger that just consumes logging
 * @param {Sring[]} [tags] The tags that will prefix the log output
 */
function generateTestAbyssLogger() {
  return function testAbyssLogger() {};
}

/**
 * Formats a date to a string suitable for database use
 * @param {Date} [date=new Date()] The date to format for database use
 * @returns {String} A database suitible date string
 */
function datify(date) {
  return (date || new Date()).toISOString().replace('T', ' ').replace('Z', '');
}

// when not ran in a test runner execute static Tester functions (excluding what's passed into Main.run) 
if (!Labrat.usingTestRunner()) {
  // ensure unhandled rejections puke with a non-zero exit code
  process.on('unhandledRejection', up => { throw up });
  // run the test(s)
  (async () => await Labrat.run(Tester))();
}