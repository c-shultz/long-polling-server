
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
const MAX_STACK_SIZE = 100;

export default class ConnectionManager {
    constructor() {
        this.connectionSet = new Set(); // All connections will be here.
        this.popReqQueue = []; // Connections waiting to pop.
        this.dataStack = [];
    }

    addConnection({onPushResponse, onPopResponse, onBusyResponse}) {
        let connection = new ConnectionDecoder({ 
            onNewPushRequest: (connection, payload) => {
                this.handleNewPush(connection, payload)
            },
            onNewPopRequest: (connection) => {
                return this.handleNewPop(connection);
            },
            handlePopResponse: (data) => onPopResponse(data),
            handlePushResponse: onPushResponse,
        });
        this.maybeAddConnection(connection);
        return connection.receiveData;
    }

    handleNewPush(connection, payload) {
        this.dataStack.push(payload);
        connection.handlePushResponse();
        this.serviceNextPopRequest();
    }

    handleNewPop(connection) {
        this.popReqQueue.push(connection); //Push pop request onto pop request queue in case it's not the latest.

        this.serviceNextPopRequest();
    }

    serviceNextPopRequest() {
        //Get oldest pop request connection from pop queue, get top of
        if ((this.dataStack.length > 0) && (this.popReqQueue.length > 0)) {
            const connection = this.popReqQueue.shift();
            const data = this.dataStack.pop();
            connection.handlePopResponse(data);
        }
    }


    maybeAddConnection(connection) {
        if (this.connectionSet.size < MAX_CONNECTIONS) {
            this.connectionSet.add(connection);
            return true;
        } else if (this.connectionSet.size == MAX_CONNECTIONS) {
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


class ConnectionDecoder {
    constructor({onNewPushRequest, onNewPopRequest, handlePopResponse, handlePushResponse}) {
        this.push_state = PUSH_STATE.UNKNOWN;
        this.payload_cursor = 0; //Next payload write position for incoming data.
        this.payload = null;
        this.created_at = Date.now();

        // Callbacks for when all headers/payloads are complete.
        this.push = (payload) => onNewPushRequest(this, payload);
        this.pop = () => onNewPopRequest(this);
        this.handlePopResponse = handlePopResponse;
        this.handlePushResponse = handlePushResponse;
    }

    receiveData = (buffer) => {
        
        switch(this.push_state) {
            case PUSH_STATE.UNKNOWN:
                const {type, payload_size} = this.decodeHeader(buffer);
                if (type == HEADER_TYPE.PUSH) {
                    this.push_state = PUSH_STATE.RECEIVING;
                    this.payload_size = payload_size;
                    this.payload = this.createPayloadBuffer(buffer, payload_size);
                    this.payload_cursor = this.payload_size;
                } else {
                    this.pop(); //Go straight to pop (since we don't need to receive any payload bytes);
                }
                break;
            case PUSH_STATE.RECEIVING:
                this.copyToPayload(this.payload, buffer, this.payload_cursor);
                this.payload_cursor += this.buffer.length;
                break;
            default:
                throw new Error("Unexpected connection state.");
        }


        if (this.payload_cursor > this.payload.length) {
            throw new RangeError("Unexpected error. Payload cursor extends past buffer length");
        }
        else if (this.payload_cursor == this.payload.length) {
            this.push(this.payload);
        }
    };
    
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
        let parsed_type = ((BITMASK_HEADER_TYPE & header_byte) == 0) ? HEADER_TYPE.PUSH : HEADER_TYPE.POP;

        if (parsed_type == HEADER_TYPE.PUSH) {
            parsed_size = BITMASK_PAYLOAD_SIZE & header_byte; 
            if (parsed_size < 1) {
               throw new RangeError("Payload size must be one or greater (since the size includes the header and at least one payload byte.");
            }
            if (parsed_size > BITMASK_PAYLOAD_SIZE) { //Check maximum for the sake of completness. Bitmask should prevent this.
               throw new RangeError("Unexpected parsing error. Payload too large.");
            }
        } else {
            parsed_size = null; //Just set to null for pop since it's ignored.
        }

        return {
            type: parsed_type,
            payload_size: parsed_size //Trim off header from size and only deal with data payload going forward.
        };

    }

};