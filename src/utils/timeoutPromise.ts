export const timeoutPromise = <T>(promise: Promise<T>, reason: string, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => setTimeout(() => reject(reason), ms))
  ]);
}