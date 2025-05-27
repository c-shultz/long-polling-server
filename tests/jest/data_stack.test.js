import { describe, expect, beforeEach, test } from "@jest/globals";
import DataStack from "../../src/lib/data_stack.js";

describe("DataStack", () => {
  let dataStack;
  const buf1 = Buffer([]);

  beforeEach(() => {
    dataStack = new DataStack();
  });

  test("Push before pop.", (done) => {
    dataStack.requestPush(buf1, () => {
      // Pop right after push.
      dataStack.requestPop((poppedBuf) => {
        expect(poppedBuf).toBe(buf1);
      });
      done();
    });
  });

  test("Pop then push.", (done) => {
    dataStack.requestPop((poppedBuf) => {
      expect(poppedBuf).toBe(buf1);
      done();
    });
    dataStack.requestPush(buf1, () => {});
  });
});
