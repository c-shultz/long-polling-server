import { Socket } from "node:net";

const BITMASK_HEADER_TYPE : number = 0x80; // MSb mask for header type determination. '0' is push, '1' is pop.
const BITMASK_PAYLOAD_SIZE : number = 0x7f; // Mask for 7 least significants bits (payload size).
const HEADER_SIZE_BYTES : number = 1; // Size of frame header in bytes.
const RESPONSE_BUSY : number = 0xff; // Byte to send for busy response.
const RESPONSE_PUSH : number = 0x00; // Byte to send to acknowledge successful push.

export type FrameType = "unknown" | "pop" | "push";

export type RequestHeader = 
  | { headerType: "unknown"; payloadSize: null}
  | { headerType: "pop"; payloadSize: null}
  | { headerType: "push"; payloadSize: number}

/**
 * Gets data to send as a response when there's no more connections available.
 * @returns {Uint8Array} - Response containing busy byte.
 */
export function getResponseBusy() : Uint8Array {
  return new Uint8Array([RESPONSE_BUSY]);
}

/**
 * Gets data to send as a response acknowledging push.
 * @returns {Uint8Array} - Response containing push byte.
 */
export function getResponsePush() : Uint8Array {
  return new Uint8Array([RESPONSE_PUSH]);
}

/**
 * Build pop response by adding header with payload size.
 * @param {Buffer} payload - Data payload WITHOUT header.
 * @returns {Buffer} .     - Full data payload WITH header.
 */
export function getResponsePop(payload : Buffer) : Buffer {
  const maxPayloadLength : number = BITMASK_PAYLOAD_SIZE;

  if (!Buffer.isBuffer(payload)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof payload,
    );
  }
  if (payload.length == 0 || payload.length > maxPayloadLength) {
    throw new RangeError("Invalid payload size.");
  }

  // Prepend payload header
  return Buffer.concat([new Uint8Array([payload.length]), payload]);
}

/**
 * Parse header to determine request type.
 * @param {Buffer} buffer  - Full incoming packet including header plus (optionally) data.
 * @returns {RequestHeader} - Request header data.
 */
export function decodeHeader(buffer : Buffer) : RequestHeader {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof buffer,
    );
  }
  if (buffer.length == 0) {
    throw new RangeError("Header can't be parsed on empty Buffer");
  }
  const headerByte : number = buffer.readUint8(0);
  let parsedSize : number | null;
  let parsedType : FrameType =
    (BITMASK_HEADER_TYPE & headerByte) == 0 ? "push" : "pop";

  if (parsedType === "push") {
    parsedSize = BITMASK_PAYLOAD_SIZE & headerByte;
    if (parsedSize < 1) {
      throw new RangeError(
        "Payload size must be one or greater (since the size includes the header and at least one payload byte.",
      );
    }
    if (parsedSize > BITMASK_PAYLOAD_SIZE) {
      // Check maximum for the sake of completness. Bitmask should prevent this.
      throw new RangeError("Unexpected parsing error. Payload too large.");
    }
    return {
      headerType: "push",
      payloadSize: parsedSize,
    };
  } else {
    return {
      headerType: parsedType,
      payloadSize: null,
    };
  }

}

/**
 * Trim off header byte
 * @param {Buffer} buffer - Buffer to modify.
 * @returns {Buffer}      - New buffer object pointing to only payload data bytes.
 */
export function trimHeader(buffer : Buffer) : Buffer {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof buffer,
    );
  }

  return buffer.subarray(HEADER_SIZE_BYTES);
}

/**
 * Determine if socket is fully open (read+write).
 * @param {Socket} socket - A socket object to check.
 * @returns {boolean}     - True if socket is fully open.
 */
export function isSocketFullyOpen(socket : Socket) : boolean {
  return socket.readable && socket.writable;
}
