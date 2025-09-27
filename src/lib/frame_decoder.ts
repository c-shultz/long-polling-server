import { logger } from "./logger.js";
import { decodeHeader, FrameType, trimHeader } from "./utils.js";

export interface DataResult {
  type: FrameType,
  payload?: Buffer
}

type ParseStage = "header" | "push_payload" | "complete";

/**
 * Class to decode and parse incoming push/pop requests.
 */
export default class FrameDecoder {
  payload: Buffer;
  payloadCursor: number;
  stage: ParseStage;
  done: Promise<DataResult>;
  resolve!: (value: DataResult | PromiseLike<DataResult>) => void;
  reject!: Function;
  /**
   * Constructor.
   */
  constructor() {
    this.payloadCursor = 0; // Next payload write position for incoming data.
    this.payload = Buffer.from([]);
    this.stage = "header";
    this.done = new Promise<DataResult>((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
  }

  /**
   * Handle a buffer full of incoming data.
   * This function can handle a buffer containing all the frame data together or can handle cases
   * where the server receives the full payload over multiple events.
   * @param {Buffer} buffer - Incoming data.
   * @returns {object}      - Status object containing decoded type, whether or not all data is received and (optionally) a full payload for push requests.
   */
  handleData(buffer : Buffer) : void {
    if (!Buffer.isBuffer(buffer)) {
      this.reject(new TypeError(
        "Unexpected data encoding. Expected Buffer received " + typeof buffer,
      ));
    }
    if (this.stage === "complete") {
      throw new Error(
        "Unexpected new data. Frame already flagged as complete.",
      );
    }
    let incomingData = buffer;
    switch (this.stage) {
      case "header": {
        // Decode header and handle frame type change accordingly.
        logger.debug("Starting to decode new frame.");
        logger.trace(buffer);
        const { headerType, payloadSize } = decodeHeader(incomingData);
        switch (headerType) {
          case "push":
            logger.debug("New frame is a push request.");
            this.payload = Buffer.allocUnsafe(payloadSize);
            incomingData = trimHeader(incomingData);
            this.stage = "push_payload";
            break;
          case "pop":
            logger.debug("New frame is a pop request.");
            this.stage = "complete";
            this.resolve({
              type: "pop"
            });

          default:
            this.reject(new Error("Unexpected frame header error."));
        }
      }
      // falls through
      case "push_payload":
        // Copy data into payload and check for completion
        logger.debug("Getting payload for push request.");
        incomingData.copy(this.payload, this.payloadCursor);

        this.payloadCursor += incomingData.length;
        if (this.payloadCursor > this.payload.length) {
          this.reject(new RangeError(
            "Unexpected error. Payload cursor extends past buffer length",
          ));
        } else if (this.payloadCursor == this.payload.length) {
          logger.debug("Finished getting data for push request.");
          this.stage = "complete";
          this.resolve({
            type: "push",
            payload: this.payload,
          });
        }

        break;
    }
  }
}
