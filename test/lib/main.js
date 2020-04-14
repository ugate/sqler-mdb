'use strict';

// TODO : ESM comment the following lines...
const { Labrat, LOGGER } = require('@ugate/labrat');
const { Manager } = require('sqler');
const Path = require('path');
const Fs = require('fs');
const Os = require('os');
const { expect } = require('@hapi/code');
// TODO : import { Labrat, LOGGER } from '@ugate/labrat';
// TODO : import { Manager } from 'sqler.mjs';
// TODO : import * as Fs from 'fs';
// TODO : import * as Os from 'os';
// TODO : import { expect } from '@hapi/code';

const priv = {
  mgr: null,
  cache: null,
  rowCount: 2,
  mgrLogit: !!LOGGER.info,
  vendor: 'mdb',
  conf: {}
};

// TODO : ESM uncomment the following line...
// export
class Tester {

  /**
   * Create table(s) used for testing
   */
  static async before() {
    priv.ci = 'CI' in process.env;
    Labrat.header(`${priv.vendor}: Creating test tables (if any)${priv.ci ? ` CI=${priv.ci}` : ''}`);
    
    const conf = getConf();
    priv.cache = null;
    priv.mgr = new Manager(conf, priv.cache, priv.mgrLogit || generateTestAbyssLogger);
    await priv.mgr.init();
    
    if (priv.mgr.db[priv.vendor].setup) {
      const createDB = getCrudOp('create', priv.vendor, 'database');
      await createDB(priv.mgr, priv.vendor);
      const createT1 = getCrudOp('create', priv.vendor, 'table1');
      await createT1(priv.mgr, priv.vendor);
      const createT2 = getCrudOp('create', priv.vendor, 'table2');
      await createT2(priv.mgr, priv.vendor);
    }
    priv.created = true;
  }

  /**
   * Drop table(s) used for testing
   */
  static async after() {
    if (!priv.created) {
      Labrat.header(`${priv.vendor}: Skipping dropping of test tables/database`);
      return;
    }
    Labrat.header(`${priv.vendor}: Dropping test tables/database (if any)`);
    
    const conf = getConf();
    priv.cache = null;
    if (!priv.mgr) {
      priv.mgr = new Manager(conf, priv.cache, priv.mgrLogit || generateTestAbyssLogger);
      await priv.mgr.init();
    }
    
    try {
      if (priv.mgr.db[priv.vendor].setup) {
        const deleteDB = getCrudOp('delete', priv.vendor, 'database');
        await deleteDB(priv.mgr, priv.vendor);
      }
      priv.created = false;
    } catch (err) {
      if (LOGGER.warn) LOGGER.warn(`${priv.vendor}: Failed to delete tables/database${priv.ci ? ` (CI=${priv.ci})` : ''}`, err);
      throw err;
    }
    return priv.mgr.close();
  }

  /**
   * Start cache (if present)
   */
  static async beforeEach() {
    const cch = priv.cache;
    priv.cache = null;
    if (cch && cch.start) await cch.start();
  }

  /**
   * Stop cache (if present)
   */
  static async afterEach() {
    const cch = priv.cache;
    priv.cache = null;
    if (cch && cch.stop) await cch.stop();
  }

  //======================== Executions ========================

  /**
   * Test CRUD operations for a specified `priv.vendor` and `priv.mgr`
   */
  static async crud() {
    Labrat.header(`${priv.vendor}: Running CRUD tests`, 'info');
    const rslts = new Array(3);
    let rslti = -1, lastUpdated;

    // expect CRUD results
    const crudly = (rslt, label, nameIncl, count = 2) => {
      if (!rslt.rows) return;
      expect(rslt.rows, `CRUD ${label} rows`).array();
      if (!label.includes('read')) return;
      expect(rslt.rows, `CRUD ${label} rows.length`).length(count);
      let updated;
      for (let row of rslt.rows) {
        expect(row, `CRUD ${label} row`).object();
        if (nameIncl) expect(row.name, `CRUD ${label} row.name`).includes(nameIncl);
        updated = new Date(row.updated) || row.updated;
        expect(updated, `CRUD ${label} row.updated`).date();
        if (lastUpdated) expect(updated, `CRUD ${label} row.updated > lastUpdated`).greaterThan(lastUpdated);
        // TODO : expect for binary report?
        // write the report(s) to file?
        // let report, fpth;
        // for (let row of rslt.rows) {
        //   report = row.report;
        //   if (report) {
        //     // SQL Server stores varbinary as hexadecimal of base64 encoded images
        //     //report = Buffer.from(Buffer.from(report).toString('utf8')).toString('base64');
        //     fpth = `${Os.tmpdir()}/sqler-mysql-${connName}-read-${row.id}.png`;
        //     await Fs.promises.writeFile(fpth, report);
        //   }
        // }
      }
      lastUpdated = updated;
    };

    const create = getCrudOp('create', priv.vendor);
    rslts[++rslti] = await create(priv.mgr, priv.vendor);
    crudly(rslts[rslti], 'create');

    const read = getCrudOp('read', priv.vendor);
    rslts[++rslti] = await read(priv.mgr, priv.vendor);
    crudly(rslts[rslti], 'read', 'TABLE');

    const update = getCrudOp('update', priv.vendor);
    rslts[++rslti] = await update(priv.mgr, priv.vendor);
    crudly(rslts[rslti], 'update');

    rslts[++rslti] = await read(priv.mgr, priv.vendor);
    crudly(rslts[rslti], 'update read', 'UPDATE');

    const del = getCrudOp('delete', priv.vendor);
    rslts[++rslti] = await del(priv.mgr, priv.vendor);
    crudly(rslts[rslti], 'delete');

    rslts[++rslti] = await read(priv.mgr, priv.vendor);
    crudly(rslts[rslti], 'delete read', null, 0);

    if (LOGGER.debug) LOGGER.debug(`CRUD ${priv.vendor} execution results:`, ...rslts);
    Labrat.header(`${priv.vendor}: Completed CRUD tests`, 'info');
    return rslts;
  }

  static async invalidSqlThrow() {
    return priv.mgr.db[priv.vendor].error.update.non.exist({}, ['error']);
  }

  static async invalidBindThrow() {
    const date = datify();
    return priv.mgr.db[priv.vendor].create.table.rows({
      binds: {
        id: 500, name: 'SHOULD NEVER GET INSERTED', created: date, updated: date,
        id2: 500, name2: 'SHOULD NEVER GET INSERTED', /* report2 missing should throw error */ created2: date, updated2: date
      }
    });
  }

  //====================== Configurations ======================

  static async initThrow() {
    // need to set a conf override to prevent overwritting of privateConf.username
    const conf = getConf({ pool: null });
    conf.univ.db[priv.vendor].username = 'invalid';
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit || generateTestAbyssLogger);
    await mgr.init();
    return mgr.close();
  }

  static async noDriverOptionsThrow() {
    const conf = getConf({ driverOptions: null });
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async noDriverOptionsPool() {
    const conf = getConf({
      driverOptions: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        delete conn[prop].pool;
      }
    });
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async noPool() {
    const conf = getConf({ pool: null });
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit || generateTestAbyssLogger);
    await mgr.init();
    return mgr.close();
  }

  static async invalidDriverOptionsConnObjThrow() {
    const conf = getConf({
      driverOptions: (prop, conn) => {
        conn.bad = {};
        conn[prop] = conn[prop] || {};
        conn[prop].connection = conn[prop].connection || {};
        conn[prop].connection.object = '${bad}';
      }
    });
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async invalidDriverOptionsConnPrivObjThrow() {
    const conf = getConf({
      driverOptions: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        conn[prop].connection = conn[prop].connection || {};
        conn[prop].connection.object = '${bad}';
      }
    });
    conf.univ.db[priv.vendor].bad = {};
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async invalidDriverOptionsConnRefThrow() {
    const conf = getConf({
      driverOptions: (prop, conn) => {
        conn[prop] = conn[prop] || {};
        conn[prop].connection = conn[prop].connection || {};
        conn[prop].connection.missing = '${nonExistentProperty}';
      }
    });
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async multipleConnections() {
    const conf = getConf();
    const conn = JSON.parse(JSON.stringify(conf.db.connections[0]));
    conn.name += '2';
    conf.db.connections.push(conn);
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit);
    await mgr.init();
    return mgr.close();
  }

  static async closeBeforeInit() {
    const conf = getConf();
    const mgr = new Manager(conf, priv.cache, priv.mgrLogit || generateTestAbyssLogger);
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
  let conf = priv.conf[priv.vendor];
  if (!conf) {
    conf = priv.conf[priv.vendor] = JSON.parse(Fs.readFileSync(Path.join(`test/fixtures/${priv.vendor}`, `conf${priv.ci ? '-ci' : ''}.json`), 'utf8'));
    if (!priv.univ) {
      priv.univ = JSON.parse(Fs.readFileSync(Path.join('test/fixtures', `priv${priv.ci ? '-ci' : ''}.json`), 'utf8')).univ;
    }
    conf.univ = priv.univ;
    conf.mainPath = 'test';
    conf.db.dialects.mdb = './test/dialects/test-dialect.js';
    if (!conf.univ.db.mdb.host || conf.univ.db.mdb.host === 'localhost' || conf.univ.db.mdb.host === '127.0.0.1') {
      //if (!conf.univ.db.mdb.host) conf.univ.db.mdb.host = Os.hostname();
      // NOTE : For simplicity, tests for localhost require a user to be setup w/o a password
      delete conf.univ.db.mdb.password;
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