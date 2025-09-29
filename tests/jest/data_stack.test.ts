import { describe, expect, beforeEach, test } from "vitest";
import CancellableDataStack from "../../src/lib/data_stack.js";


describe("DataStack", () => {
  let dataStack : CancellableDataStack;
  const buf1 = Buffer.from([]);

  beforeEach(() => {
    dataStack = new CancellableDataStack();
  });

  test("Push before pop.", async (done) => {
    dataStack.push(buf1);
    const poppedBuf = await dataStack.pop();
    expect(poppedBuf).toBe(buf1);
  });

  test("Pop then push.", async (done) => {
    const poppingPromise = dataStack.pop();
    await dataStack.push(buf1);
    const poppedBuf = await poppingPromise;
    expect(poppedBuf).toBe(buf1);
  });
});
