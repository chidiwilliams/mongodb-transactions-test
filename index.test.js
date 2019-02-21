/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
require('jest');
const mongoose = require('mongoose');
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

test("should update user's count with Transactions [delay - 500]", async (done) => {
  const user = await User.create({});

  await Promise.all(
    [...new Array(10)].map((x, i) => asyncTimeout(async () => {
      const session = await conn.db.startSession({ readPreference: { mode: 'primary' } });
      await session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });

      await runTransactionWithRetry(async () => {
        await User.findByIdAndUpdate(user._id, { $inc: { count: 1 } }, { session, new: true });
      }, session);
      await commitWithRetry(session);
    }, i * 500)),
  );

  const dbUser = await User.findById(user._id);
  expect(dbUser).toHaveProperty('_id');
  expect(dbUser).toHaveProperty('count', 10);
  done();
});

test("should update user's count with Transactions [delay - 100]", async (done) => {
  const user = await User.create({});

  await Promise.all(
    [...new Array(10)].map((x, i) => asyncTimeout(async () => {
      const session = await conn.db.startSession({ readPreference: { mode: 'primary' } });
      await session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });

      await runTransactionWithRetry(async () => {
        await User.findByIdAndUpdate(user._id, { $inc: { count: 1 } }, { session, new: true });
      }, session);
      await commitWithRetry(session);
    }, i * 100)),
  );

  const dbUser = await User.findById(user._id);
  expect(dbUser).toHaveProperty('_id');
  expect(dbUser).toHaveProperty('count', 10);
  done();
});
