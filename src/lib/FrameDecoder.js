import { decodeHeader, FRAME_TYPE, copyToPayload, trimHeader } from "./utils.js";

export default class FrameDecoder
{
    constructor()
    {
        this.created_at = Date.now();
        this.status = {
            type: FRAME_TYPE.UNKNOWN,
            complete: false
        }
        this.payload = null;
        this.payload_cursor = 0; //Next payload write position for incoming data.
    }

    handleData(buffer)
    {
        if (!Buffer.isBuffer(buffer)) {
            throw new TypeError("Unexpected data encoding. Expected Buffer received " + typeof(buffer));
        }
        if (this.status.complete) {
            throw new Error("Unexpcted new data. Frame already flagged as complete.");
        }
        let incomingData = buffer;
        switch (this.status.type) {
            case FRAME_TYPE.UNKNOWN:
                // Decode header and handle frame type change accordingly.
                const {header_type, payload_size} = decodeHeader(incomingData);
                switch (header_type) {
                    case FRAME_TYPE.PUSH:
                        this.payload = Buffer.allocUnsafe(payload_size);
                        incomingData = trimHeader(incomingData);
                        this.status.type = FRAME_TYPE.PUSH;
                        break;
                    case FRAME_TYPE.POP:
                        this.status.type = FRAME_TYPE.POP;
                        this.status.complete = true;
                        return {
                            status: this.status
                        }
                    default:
                        throw new Error("Unexpcted frame header error.");
                }
                // break intentionally omitted to handle first data bytes that may be delivered with header.
            case FRAME_TYPE.PUSH:
                // Copy data into payload and check for completion
                incomingData.copy(this.payload, this.payload_cursor);
                this.payload_cursor += incomingData.length;
                if (this.payload_cursor > this.payload.length) {
                    throw new RangeError("Unexpected error. Payload cursor extends past buffer length");
                } else if (this.payload_cursor == this.payload.length) {
                    this.status.complete = true;
                    return {
                        status: this.status,
                        payload: this.payload
                    }
                }

                break;
            case FRAME_TYPE.POP: // POP should have been handled during first data event, so this is unexpected.
            default:
                throw new Error("Unexpcted new data. Frame already flagged as complete.");
        }
        return {
            status: this.status
        }
    }



}