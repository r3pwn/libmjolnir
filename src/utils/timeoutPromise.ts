export const timeoutPromise = <T>(promise: Promise<T>, reason: string, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>(() => {
      setTimeout(() => {
        throw new Error(reason);
      }, ms)
    })
  ]);
}