import { Socket } from "node:net";

const BITMASK_HEADER_TYPE = 0x80; // MSb mask for header type determination. '0' is push, '1' is pop.
const BITMASK_PAYLOAD_SIZE = 0x7f; // Mask for 7 least significants bits (payload size).
const HEADER_SIZE_BYTES = 1; // Size of frame header in bytes.
const RESPONSE_BUSY = 0xff; // Byte to send for busy response.
const RESPONSE_PUSH = 0x00; // Byte to send to acknowledge successful push.

export const FRAME_TYPE = {
  UNKNOWN: "Unknown", // Header type not known.
  POP: "PopRequest", // Header indicates pop.
  PUSH: "PushRequest", // Header indicates push (and includes payload bits).
};

/**
 * Gets data to send as a response when there's no more connections available.
 * @returns {Uint8Array} - Response containing busy byte.
 */
export function getResponseBusy() {
  return new Uint8Array([RESPONSE_BUSY]);
}

/**
 * Gets data to send as a response acknowledging push.
 * @returns {Uint8Array} - Response containing push byte.
 */
export function getResponsePush() {
  return new Uint8Array([RESPONSE_PUSH]);
}

/**
 * Build pop response by adding header with payload size.
 * @param {Buffer} payload - Data payload WITHOUT header.
 * @returns {Buffer} .     - Full data payload WITH header.
 */
export function getResponsePop(payload) {
  const maxPayloadLength = BITMASK_PAYLOAD_SIZE;

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
 * @param {Buffer} buffer - Full incoming packet including header plus (optionally) data.
 * @returns {object}      - Type (as FRAME_TYPE) and (optionally) header size.
 */
export function decodeHeader(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof buffer,
    );
  }
  if (buffer.length == 0) {
    throw new RangeError("Header can't be parsed on empty Buffer");
  }
  const headerByte = buffer.readUint8(0);
  let parsedSize;
  let parsedType =
    (BITMASK_HEADER_TYPE & headerByte) == 0 ? FRAME_TYPE.PUSH : FRAME_TYPE.POP;

  if (parsedType == FRAME_TYPE.PUSH) {
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
  } else {
    parsedSize = null; // Just set to null for pop since it's ignored.
  }

  return {
    headerType: parsedType,
    payloadSize: parsedSize,
  };
}

/**
 * Trim off header byte
 * @param {Buffer} buffer - Buffer to modify.
 * @returns {Buffer}      - New buffer object pointing to only payload data bytes.
 */
export function trimHeader(buffer) {
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
export function isSocketFullyOpen(socket) {
  return socket.readable && socket.writable;
}
