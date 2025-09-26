import { describe, expect, beforeEach, test } from "vitest";
import DataStack from "../../src/lib/data_stack.js";


describe("DataStack", () => {
  let dataStack : DataStack;
  const buf1 = Buffer.from([]);

  beforeEach(() => {
    dataStack = new DataStack();
  });

  let popP = () => new Promise( (resolve) => dataStack.requestPop(resolve));
  let pushP = (buf : Buffer) => new Promise( (resolve) => dataStack.requestPush(buf, resolve));

  test("Push before pop.", async (done) => {
    pushP(buf1);
    const poppedBuf = await popP();
    expect(poppedBuf).toBe(buf1);
  });

  test("Pop then push.", async (done) => {
    const poppingPromise = popP();
    await pushP(buf1);
    const poppedBuf = await poppingPromise;
    expect(poppedBuf).toBe(buf1);

  });
});
