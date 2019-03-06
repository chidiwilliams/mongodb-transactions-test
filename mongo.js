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

// async function runTransactionWithRetry(txnFunc, session) {
//   try {
//     await txnFunc(session);
//   } catch (error) {
//     console.log('Transaction aborted. Caught exception during transaction.');

//     // If transient error, retry the whole transaction
//     if (error.errorLabels && error.errorLabels.indexOf('TransientTransactionError') >= 0) {
//       console.log('TransientTransactionError, retrying transaction ...');
//       await runTransactionWithRetry(txnFunc, session);
//     } else {
//       throw error;
//     }
//   }
// }

async function runTransactionWithRetry(txnFunc, session) {
  while (true) {
    try {
      const x = await txnFunc(session);
      return x;
    } catch (error) {
      console.log('Transaction aborted. Caught exception during transaction.');

      const isTransientError = error.hasOwnProperty('errorLabels')
        && error.errorLabels.includes('TransientTransactionError');
      if (!isTransientError) throw error;

      // transaction vanished for some reason, so we will abort it and try it again
      if(error.codeName == 'NoSuchTransaction') {
        await session.abortTransaction()
        await session.startTransaction({ writeConcern: { w: 1 }})
      }
      // If transient error, retry the whole transaction
      console.log('TransientTransactionError, retrying transaction ...');
    }
  }
}

module.exports = { runTransactionWithRetry, commitWithRetry };
