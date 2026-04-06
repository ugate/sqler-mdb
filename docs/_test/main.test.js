'use strict';

process.env.UV_THREADPOOL_SIZE = 10;

const test = require('node:test');
const assert = require('node:assert/strict');
const Tester = require('./lib/main');

const TEST_TKO = 3000;
const TEST_LONG_TKO = 7000;
const plan = 'MySQL DB Manager';

async function expectRejects(fn, label) {
  await assert.rejects(async () => {
    await fn();
  }, undefined, label);
}

test(plan, async (t) => {
  if (Tester.before) await Tester.before();

  t.after(async () => {
    if (Tester.after) await Tester.after();
  });

  if (Tester.beforeEach || Tester.afterEach) {
    t.beforeEach(async () => {
      if (Tester.beforeEach) await Tester.beforeEach();
    });
    t.afterEach(async () => {
      if (Tester.afterEach) await Tester.afterEach();
    });
  }

  await t.test('Connection Failure', { timeout: TEST_LONG_TKO }, async () => {
    await expectRejects(Tester.initThrow, 'init throw');
  });

  await t.test('No Pool', { timeout: TEST_TKO }, async () => {
    await Tester.poolNone();
  });

  await t.test('Pool Property Defaults', { timeout: TEST_TKO }, async () => {
    await Tester.poolPropSwap();
  });

  await t.test('Missing Driver Options', async () => {
    await expectRejects(Tester.driverOptionsNoneThrow, 'no driver options throw');
  });

  await t.test('Driver Options No Pool/Connection', { timeout: TEST_TKO }, async () => {
    await Tester.driverOptionsPoolConnNone();
  });

  await t.test('Driver Options Pool or Connection', { timeout: TEST_TKO }, async () => {
    await Tester.driverOptionsPoolConnSwap();
  });

  await t.test('Driver Options Named or Unnamed Placeholders', { timeout: TEST_TKO }, async () => {
    await Tester.driverOptionsNamedPlaceholdersSwap();
  });

  await t.test('Host and Port Defaults', { timeout: TEST_TKO }, async () => {
    await Tester.hostPortSwap();
  });

  await t.test('Multiple connections', { timeout: TEST_TKO }, async () => {
    await Tester.multipleConnections();
  });

  await t.test('Close before init', { timeout: TEST_TKO }, async () => {
    await Tester.closeBeforeInit();
  });

  await t.test('CRUD', { timeout: TEST_TKO }, async () => {
    await Tester.crud();
  });

  await t.test('CRUD Streaming', { timeout: TEST_TKO }, async () => {
    await Tester.crudStream();
  });

  await t.test('CRUD Streaming Errors', async () => {
    await expectRejects(Tester.crudStreamThrow, 'CRUD streaming throw');
  });

  await t.test('Execution Driver Options (Alternatives)', { timeout: TEST_TKO }, async () => {
    await Tester.execDriverOptionsAlt();
  });

  await t.test('Invalid SQL', async () => {
    await expectRejects(Tester.sqlInvalidThrow, 'invalid SQL throw');
  });

  await t.test('Invalid bind parameter', async () => {
    await expectRejects(Tester.bindsInvalidThrow, 'invalid bind param throw');
  });

  await t.test('Invalid Prepared Statement (Missing Database Name)', async () => {
    await expectRejects(Tester.preparedStatementInvalidThrow, 'missing DB name throw');
  });
});