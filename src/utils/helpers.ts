/**
 * Initiate a promise, but reject if it takes too long
 * @param promise - the promise to start
 * @param reason - the error message to use in case of failure
 * @param ms - the number of milliseconds to wait before reporting failure
 */
export const timeoutPromise = <T>(promise: Promise<T>, reason: string, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(reason), ms);
    })
  ]).catch(error => {
    throw new Error(error);
  });
}
