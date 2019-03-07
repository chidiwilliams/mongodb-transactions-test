async function runTransactionWithRetry(txnFunc, session, restartTransaction) {
  while (true) {
    try {
      return await txnFunc(session);
    } catch (error) {
      console.log('Transaction aborted. Caught exception during transaction.');

      const isTransientError = error.hasOwnProperty('errorLabels')
        && error.errorLabels.includes('TransientTransactionError');
      if (!isTransientError) throw error;

      if (restartTransaction) {
        // transaction vanished for some reason, so we will abort it and try it again
        if (error.codeName === 'NoSuchTransaction') {
          await session.abortTransaction();
          await session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
          });
        }
      }

      // If transient error, retry the whole transaction
      console.log('TransientTransactionError, retrying transaction ...');
    }
  }
}

async function commitWithRetry(session) {
  while (true) {
    try {
      await session.commitTransaction();
      session.endSession();
      break;
    } catch (error) {
      const isTransientError = error.errorLabels && error.errorLabels.includes('UnknownTransactionCommitResult');
      if (!isTransientError) throw new Error(error);
      console.log(error);
    }
  }
}

module.exports = { runTransactionWithRetry, commitWithRetry };
