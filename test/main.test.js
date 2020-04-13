'use strict';

process.env.UV_THREADPOOL_SIZE = 10;

const Tester = require('./lib/main');
const { Labrat } = require('@ugate/labrat');
const { expect } = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = Lab.script();
exports.lab = lab;
// ESM uncomment the following lines...
// TODO : import * as Lab from '@hapi/lab';
// TODO : import * as Tester from './lib/main.mjs';
// TODO : import { Labrat } from '@ugate/labrat';
// TODO : import { expect } from '@hapi/code';
// TODO : export * as lab from lab;

const TEST_TKO = 3000;
const TEST_LONG_TKO = 7000;
const plan = `MySQL DB Manager`;

// node test/lib/main.js someTestFunction -NODE_ENV=test

// "node_modules/.bin/lab" test/main.test.js -v
// "node_modules/.bin/lab" test/main.test.js -vi 1

lab.experiment(plan, () => {
  
  if (Tester.before) lab.before(Tester.before);
  if (Tester.after) lab.after(Tester.after);
  if (Tester.beforeEach) lab.beforeEach(Tester.beforeEach);
  if (Tester.afterEach) lab.afterEach(Tester.afterEach);

  lab.test(`${plan}: Connection failure`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'init throw' }, Tester.initThrow));
  lab.test(`${plan}: Missing driver options`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'no driver options throw' }, Tester.noDriverOptionsThrow));
  lab.test(`${plan}: Missing driver options connection`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'no driver options connection throw' }, Tester.noDriverOptionsConnThrow));
  lab.test(`${plan}: No driver options pool`, { timeout: TEST_TKO }, Tester.noDriverOptionsPool);
  lab.test(`${plan}: No pool`, { timeout: TEST_TKO }, Tester.noPool);
  lab.test(`${plan}: Invalid driver options connection object`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'driver options connection object throw' }, Tester.invalidDriverOptionsConnObjThrow));
  lab.test(`${plan}: Invalid driver options connection private object`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'driver options connection private object throw' }, Tester.invalidDriverOptionsConnPrivObjThrow));
  lab.test(`${plan}: Invalid driver options connection reference`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'driver options connection reference throw' }, Tester.invalidDriverOptionsConnRefThrow));
  lab.test(`${plan}: Multiple connections`, { timeout: TEST_TKO }, Tester.multipleConnections);
  lab.test(`${plan}: Close before init`, { timeout: TEST_TKO }, Tester.closeBeforeInit);

  lab.test(`${plan}: CRUD`, { timeout: TEST_TKO }, Tester.crud);
  lab.test(`${plan}: Invalid SQL`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'invalid SQL throw' }, Tester.invalidSqlThrow));
  lab.test(`${plan}: Invalid bind parameter`, Labrat.expectFailure('onUnhandledRejection', { expect, label: 'invalid bind param throw' }, Tester.invalidBindThrow));
  lab.test(`${plan}: Create with isolation level`, { timeout: TEST_TKO }, Tester.isolationLevel);
});