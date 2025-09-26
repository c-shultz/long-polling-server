import { describe, expect, beforeEach, test } from "vitest";
import FrameDecoder, { DataResult } from "../../src/lib/frame_decoder.js";

const PUSH_HEADER = 0x00;
const POP_HEADER = 0x80;

describe("FrameDecoder#handleData", () => {
  let frameDecoder : FrameDecoder;

  beforeEach(() => {
    frameDecoder = new FrameDecoder();
  });

  test("Unknown type before data", () => {
    expect(frameDecoder.status).toMatchObject({
      type: "unknown",
      complete: false,
    });
  });

  test("Pop request decoded.", () => {
    const messageBuffer = Buffer.from(new Uint8Array([POP_HEADER]));
    expect(frameDecoder.handleData(messageBuffer)).toMatchObject({
      status: {
        type: "pop",
        complete: true,
      },
    });
  });

  test("Valid push request decoded.", () => {
    const dataBytes : Array<number> = [0x42];
    const payloadLength : number = dataBytes.length; // Valid length will be same as dataBytes.
    const header : number = PUSH_HEADER + payloadLength;
    const messageBuffer : Buffer = Buffer.from(new Uint8Array([header].concat(dataBytes)));
    const result : DataResult = frameDecoder.handleData(messageBuffer);
    expect(result).toMatchObject({
      status: {
        type: "push",
        complete: true,
      },
    });
    expect(result.payload.readUint8(0)).toBe(dataBytes[0]);
  });

  test("Invalid push request length throws error.", () => {
    const dataBytes : Array<number> = [0x42, 0x43];
    const payloadLength : number = dataBytes.length - 1; // Claimed size too small.
    const header : number = PUSH_HEADER + payloadLength;
    const messageBuffer : Buffer = Buffer.from(new Uint8Array([header].concat(dataBytes)));
    expect(() => {
      frameDecoder.handleData(messageBuffer);
    }).toThrow(
      new RangeError(
        "Unexpected error. Payload cursor extends past buffer length",
      ),
    );
  });

  test("Frame incomplete until there's enough data.", () => {
    const dataBytes : Array<number> = [0x42];
    const payloadLength : number = dataBytes.length + 1; // Expecting two bytes, but only sending one.
    const header : number = PUSH_HEADER + payloadLength;
    const messageBuffer : Buffer = Buffer.from(new Uint8Array([header].concat(dataBytes)));
    expect(frameDecoder.handleData(messageBuffer)).toMatchObject({
      status: {
        type: "push",
        complete: false, // Incomplete because there was only one data byte received.
      },
    });
    expect(
      frameDecoder.handleData(Buffer.from(new Uint8Array([0x43]))),
    ).toMatchObject({
      // Send follow up payload byte.
      status: {
        type: "push",
        complete: true, // Should now be complete.
      },
    });
  });

  test("Data after complete frame throws error", () => {
    const messageBuffer = Buffer.from(new Uint8Array([POP_HEADER]));
    expect(frameDecoder.handleData(messageBuffer)).toMatchObject({
      status: {
        type: "pop",
        complete: true,
      },
    });
    // Send more data even though it's complete.
    expect(() => {
      frameDecoder.handleData(messageBuffer);
    }).toThrow(
      new Error("Unexpected new data. Frame already flagged as complete."),
    );
  });
});
