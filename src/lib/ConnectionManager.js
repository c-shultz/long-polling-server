
const PUSH_STATE = {
    UNKNOWN: 'Unknown', //Unknown connection type (push/pop hasn't been determined).
    RECEIVING: 'Receiving' //Connection is a push request, and we're waiting on the payload.
};

const HEADER_TYPE = {
    POP: 'Pop', //Header indicates pop.
    PUSH: 'Push', //Header indicates push (and includes payload bits).
};

const BITMASK_HEADER_TYPE = 0x80; //MSb mask for header type determination. '0' is push, '1' is pop.
const BITMASK_PAYLOAD_SIZE = 0x7F; //Mask for 7 least significants bits (payload size).
const HEADER_SIZE_BYTES = 1;

const MAX_CONNECTIONS = 100;

export default class ConnectionManager {
    constructor() {
        this.connectionQueue = [];
    }



    addConnection() {
        let newDecoder = new FrameBuilder();
        this.maybeAddConnection(newDecoder);
        return newDecoder.receiveData;
    }

    maybeAddConnection(newDecoder) {
        if (this.connectionQueue.length < MAX_CONNECTIONS) {
            this.connectionQueue.push(newDecoder);
            return true;
        } else if (this.connectionQueue.length == MAX_CONNECTIONS) {
            console.log("Bump the oldest if over ten seconds old");
            return true;
            //or maybe
            return false;
        } else {
            console.log("No room here, friends");
            return false;
        }


    }
}

class FrameBuilder {
    constructor() {
        this.push_state = PUSH_STATE.UNKNOWN;
        this.payload_cursor = 0; //Next payload write position for incoming data.
        this.payload = null;
    }

    receiveData = (buffer) => {
        
        switch(this.push_state) {
            case PUSH_STATE.UNKNOWN:
                const {type, payload_size} = this.decodeHeader(buffer);
                if (type == HEADER_TYPE.PUSH) {
                    this.push_state = PUSH_STATE.RECEIVING;
                    this.payload_size = payload_size;
                    this.payload = this.createPayloadBuffer(buffer, payload_size);
                    this.buffer_cursor = this.payload_size;
                } else {
                    this.pop(); //Go straight to pop (since we don't need to receive any payload bytes);
                }
                break;
            case PUSH_STATE.RECEIVING:
                this.copyToPayload(this.payload, buffer, this.payload_cursor);
                this.payload_cursor += this.buffer.length;
                if (this.payload_cursor >= this.payload.length) {
                    throw new RangeError("Unexpected error. Payload cursor extends past buffer length");
                }
                else if (this.payload_cursor == this.payload.length - 1) {
                    this.push();
                }
                break;
            default:
                throw new Error("Unexpected connection state.");
        }
    };
    
    pop() {
        console.log("Connection sees pop");
    }

    push() {
        console.log("We finished a frame. Yay.");
    }
    
    //todo: move all below to decoder lib
    createPayloadBuffer(buffer, payload_size) {
        if (!Buffer.isBuffer(buffer)){
            throw new TypeError("Unexpected data encoding. Expected Buffer received " + typeof(buffer));
        }
        if (buffer.length > payload_size + HEADER_SIZE_BYTES) {
            throw new RangeError("Malformed header/payload when initializing payload: header indicated " + payload_size + " bytes, but actual was " + buffer.length);
        }
        return Buffer.from(buffer.subarray(HEADER_SIZE_BYTES));  //Trim off header, and copy initial data into payload.
    }

    copyToPayload(copyFrom, copyTo, bufferCursor){
        if (!Buffer.isBuffer(copyFrom)){
            throw new TypeError("Unexpected data encoding. Expected Buffer received " + typeof(copyFrom));
        }
        if (!Buffer.isBuffer(copyTo)){
            throw new TypeError("Unexpected data encoding. Expected Buffer received " + typeof(copyTo));
        }
        if ((bufferCursor + copyFrom.length) > copyTo.length) {
            throw new RangeError("Malformed header/payload. Payload would exceed size indicated by header.");
        }
        copyFrom.copy(copyTo, bufferCursor);
    }

    decodeHeader(buffer) {
        if (!Buffer.isBuffer(buffer)){
            throw new TypeError("Unexpected data encoding. Expected Buffer received " + typeof(buffer));
        }
        if (buffer.length == 0){
            throw new RangeError("Header can't be parsed on empty Buffer");
        }
        const header_byte = buffer.readUint8(0);
        let parsed_size;
        let parsed_type = ((BITMASK_HEADER_TYPE & header_byte) == 0) ? HEADER_TYPE.POP : HEADER_TYPE.PUSH;

        if (parsed_type == HEADER_TYPE.PUSH) {
            parsed_size = BITMASK_PAYLOAD_SIZE & header; 
            if (parsed_size < 2) {
               throw new RangeError("Payload size must be two or greater (since the size includes the header and at least one payload byte.");
            }
            if (parsed_size > BITMASK_PAYLOAD_SIZE) { //Check maximum for the sake of completness. Bitmask should prevent this.
               throw new RangeError("Unexpected parsing error. Payload too large.");
            }
        } else {
            parsed_size = null; //Just set to null for pop since it's ignored.
        }

        return {
            type: parsed_type,
            payload_size: parsed_size - HEADER_SIZE_BYTES //Trim off header from size and only deal with data payload going forward.
        };

    }

};