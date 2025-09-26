import { logger } from "./logger.js";
import { decodeHeader, FrameType, trimHeader } from "./utils.js";

export interface FrameStatus {
  type: FrameType,
  complete: boolean
}

export interface DataResult {
  status: FrameStatus,
  payload: Buffer
}

/**
 * Class to decode and parse incoming push/pop requests.
 */
export default class FrameDecoder {
  status: FrameStatus;
  payload: Buffer
  payloadCursor: number;
  /**
   * Constructor.
   */
  constructor() {
    this.status = {
      type: "unknown", // Start out as unknown, and will be set to push/pop depending on header.
      complete: false, // To be set to true after all data is received from frame (may come all at once or not).
    };
    this.payload = null;
    this.payloadCursor = 0; // Next payload write position for incoming data.
  }

  /**
   * Handle a buffer full of incoming data.
   * This function can handle a buffer containing all the frame data together or can handle cases
   * where the server receives the full payload over multiple events.
   * @param {Buffer} buffer - Incoming data.
   * @returns {object}      - Status object containing decoded type, whether or not all data is received and (optionally) a full payload for push requests.
   */
  handleData(buffer : Buffer) : DataResult {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError(
        "Unexpected data encoding. Expected Buffer received " + typeof buffer,
      );
    }
    if (this.status.complete) {
      throw new Error(
        "Unexpected new data. Frame already flagged as complete.",
      );
    }
    let incomingData = buffer;
    switch (this.status.type) {
      case "unknown": {
        // Decode header and handle frame type change accordingly.
        logger.debug("Starting to decode new frame.");
        logger.trace(buffer);
        const { headerType, payloadSize } = decodeHeader(incomingData);
        switch (headerType) {
          case "push":
            logger.debug("New frame is a push request.");
            this.payload = Buffer.allocUnsafe(payloadSize);
            incomingData = trimHeader(incomingData);
            this.status.type = "push";
            break;
          case "pop":
            logger.debug("New frame is a pop request.");
            this.status.type = "pop";
            this.status.complete = true;
            return {
              status: this.status,
              payload: null
            };
          default:
            throw new Error("Unexpcted frame header error.");
        }
      }
      // falls through
      case "push":
        // Copy data into payload and check for completion
        logger.debug("Getting payload for push request.");
        incomingData.copy(this.payload, this.payloadCursor);

        this.payloadCursor += incomingData.length;
        if (this.payloadCursor > this.payload.length) {
          throw new RangeError(
            "Unexpected error. Payload cursor extends past buffer length",
          );
        } else if (this.payloadCursor == this.payload.length) {
          logger.debug("Finished getting data for push request.");
          this.status.complete = true;
          return {
            status: this.status,
            payload: this.payload,
          };
        }

        break;
      case "pop": // POP should have been handled during first data event since it's only a byte, so this is unexpected.
      default:
        throw new Error(
          "Unexpected new data. Frame already flagged as complete.",
        );
    }
    return {
      status: this.status,
      payload: null
    };
  }
}
