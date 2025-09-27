import { describe, expect, beforeEach, test } from "vitest";
import FrameDecoder, { DataResult } from "../../src/lib/frame_decoder.js";

const PUSH_HEADER = 0x00;
const POP_HEADER = 0x80;

describe("FrameDecoder#handleData", () => {
  let frameDecoder : FrameDecoder;

  beforeEach(() => {
    frameDecoder = new FrameDecoder();
  });

  test("Pop request decoded.", async () => {
    const messageBuffer = Buffer.from(new Uint8Array([POP_HEADER]));
    frameDecoder.handleData(messageBuffer);
    const result = await frameDecoder.done; 
    expect(result).toMatchObject({
      type: "pop",
    });
  });

  test("Valid push request decoded.", async () => {
    const dataBytes : Array<number> = [0x42];
    const payloadLength : number = dataBytes.length; // Valid length will be same as dataBytes.
    const header : number = PUSH_HEADER + payloadLength;
    const messageBuffer : Buffer = Buffer.from(new Uint8Array([header].concat(dataBytes)));
    frameDecoder.handleData(messageBuffer);
    const result = await frameDecoder.done;
    expect(result).toMatchObject({
      type: "push",
    });
    expect(result.payload).not.toBeNull();
    expect(result.payload!.readUint8(0)).toBe(dataBytes[0]);
  });

  test("Invalid push request length throws error.", async () => {
    const dataBytes : Array<number> = [0x42, 0x43];
    const payloadLength : number = dataBytes.length - 1; // Claimed size too small.
    const header : number = PUSH_HEADER + payloadLength;
    const messageBuffer : Buffer = Buffer.from(new Uint8Array([header].concat(dataBytes)));
    frameDecoder.handleData(messageBuffer);
    await expect(frameDecoder.done)
      .rejects
      .toThrow(
        new RangeError(
          "Unexpected error. Payload cursor extends past buffer length",
        )
      );
  });

  test("Frame completes after handling multiple data.", async () => {
    const dataBytes : Array<number> = [0x42];
    const payloadLength : number = dataBytes.length + 1; // Expecting two bytes, but only sending one.
    const header : number = PUSH_HEADER + payloadLength;
    const messageBuffer : Buffer = Buffer.from(new Uint8Array([header].concat(dataBytes)));
    frameDecoder.handleData(messageBuffer);
    frameDecoder.handleData(Buffer.from(new Uint8Array([0x43])));
    const result = await frameDecoder.done;
    expect(result).toMatchObject({
      type: "push",
    });
  });

  test("Data after complete frame throws error", async () => {
    const messageBuffer = Buffer.from(new Uint8Array([POP_HEADER]));
    frameDecoder.handleData(messageBuffer);
    const result = await frameDecoder.done;
    expect(result).toMatchObject({
      type: "pop",
    });
    // Send more data even though it's complete.
    expect(() => {
      frameDecoder.handleData(messageBuffer);
    }).toThrow(
      new Error("Unexpected new data. Frame already flagged as complete."),
    );
  });
});
