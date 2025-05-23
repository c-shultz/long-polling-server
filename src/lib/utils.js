const BITMASK_HEADER_TYPE = 0x80; //MSb mask for header type determination. '0' is push, '1' is pop.
const BITMASK_PAYLOAD_SIZE = 0x7f; //Mask for 7 least significants bits (payload size).
const HEADER_SIZE_BYTES = 1;
const RESPONSE_BUSY = 0xff;
const RESPONSE_PUSH = 0x00;

export const FRAME_TYPE = {
  UNKNOWN: "Unknown", //Header type not known.
  POP: "PopRequest", //Header indicates pop.
  PUSH: "PushRequest", //Header indicates push (and includes payload bits).
};

export function getResponseBusy() {
  return new Uint8Array([RESPONSE_BUSY]);
}

export function getResponsePush() {
  return new Uint8Array([RESPONSE_PUSH]);
}

export function getResponsePop(payload) {
  const max_payload_length = BITMASK_PAYLOAD_SIZE;

  if (!Buffer.isBuffer(payload)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof payload,
    );
  }
  if (payload.length == 0 || payload.length > max_payload_length) {
    throw new RangeError("Invalid payload size.");
  }

  //Prepend payload header
  return Buffer.concat([new Uint8Array([payload.length]), payload]);
}

export function decodeHeader(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof buffer,
    );
  }
  if (buffer.length == 0) {
    throw new RangeError("Header can't be parsed on empty Buffer");
  }
  const header_byte = buffer.readUint8(0);
  let parsed_size;
  let parsed_type =
    (BITMASK_HEADER_TYPE & header_byte) == 0 ? FRAME_TYPE.PUSH : FRAME_TYPE.POP;

  if (parsed_type == FRAME_TYPE.PUSH) {
    parsed_size = BITMASK_PAYLOAD_SIZE & header_byte;
    if (parsed_size < 1) {
      throw new RangeError(
        "Payload size must be one or greater (since the size includes the header and at least one payload byte.",
      );
    }
    if (parsed_size > BITMASK_PAYLOAD_SIZE) {
      //Check maximum for the sake of completness. Bitmask should prevent this.
      throw new RangeError("Unexpected parsing error. Payload too large.");
    }
  } else {
    parsed_size = null; //Just set to null for pop since it's ignored.
  }

  return {
    header_type: parsed_type,
    payload_size: parsed_size,
  };
}

export function trimHeader(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof buffer,
    );
  }

  return buffer.subarray(HEADER_SIZE_BYTES);
}

export function copyToPayload(copyFrom, copyTo, bufferCursor) {
  if (!Buffer.isBuffer(copyFrom)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof copyFrom,
    );
  }
  if (!Buffer.isBuffer(copyTo)) {
    throw new TypeError(
      "Unexpected data encoding. Expected Buffer received " + typeof copyTo,
    );
  }
  if (bufferCursor + copyFrom.length > copyTo.length) {
    throw new RangeError(
      "Malformed header/payload. Payload would exceed size indicated by header.",
    );
  }

  copyFrom.copy(copyTo, bufferCursor);
}
