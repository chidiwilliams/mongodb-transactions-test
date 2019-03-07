require('jest');
const mongoose = require('mongoose');
const fs = require('fs');
const { conn } = require('./');
const { runTransactionWithRetry, commitWithRetry } = require('./mongo');

jest.setTimeout(30000);
const { User } = conn.models;

beforeAll(() => {});

async function deleteCollections() {
  await Promise.all(Object.values(conn.db.collections).map(coll => coll.deleteMany()));
}

beforeEach(async () => {
  await deleteCollections();
  await User.ensureIndexes();
});

afterEach(async () => {
  await deleteCollections();
});

afterAll(async () => {
  await deleteCollections();
  await mongoose.disconnect();
});

async function asyncTimeout(func, delay) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      await func();
      resolve();
    }, delay);
  });
}

test("should update user's count with Transactions [restart=false]", async (done) => {
  const user = await User.create({});

  async function txnFunc(session) {
    const op = await conn.db.db.executeDbAdminCommand({ currentOp: 1 });
    fs.appendFileSync('logs/norestart.log', `${JSON.stringify({ timestamp: new Date(), op })}\n`);
    await User.findByIdAndUpdate(user._id, { $inc: { count: 1 } }, { session, new: true });
  }

  await Promise.all(
    [...Array(10)].map(() => asyncTimeout(async () => {
      const session = await conn.db.startSession({ readPreference: { mode: 'primary' } });
      await session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });

      await runTransactionWithRetry(txnFunc, session, false);
      await commitWithRetry(session);
    }, 0)),
  );

  const dbUser = await User.findById(user._id);
  expect(dbUser).toHaveProperty('_id');
  expect(dbUser).toHaveProperty('count', 10);
  done();
});

test.only("should update user's count with Transactions [restart=true]", async (done) => {
  const user = await User.create({});

  async function txnFunc(session) {
    const op = await conn.db.db.executeDbAdminCommand({ currentOp: 1 });
    fs.appendFileSync('logs/restart.log', `${JSON.stringify({ timestamp: new Date(), op })}\n`);
    await User.findByIdAndUpdate(user._id, { $inc: { count: 1 } }, { session, new: true });
  }

  await Promise.all(
    [...Array(10)].map(() => asyncTimeout(async () => {
      const session = await conn.db.startSession({ readPreference: { mode: 'primary' } });
      await session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });

      await runTransactionWithRetry(txnFunc, session, true);
      await commitWithRetry(session);
    }, 0)),
  );

  const dbUser = await User.findById(user._id);
  expect(dbUser).toHaveProperty('_id');
  expect(dbUser).toHaveProperty('count', 10);
  done();
});
