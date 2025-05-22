import net from 'node:net';
import ConnectionManager from './lib/ConnectionManager.js';
import { getResponseBusy, getResponsePush, getResponsePop, FRAME_TYPE } from './lib/utils.js';
import FrameDecoder from './lib/FrameDecoder.js';
import DataStack from './lib/DataStack.js';

const SERVER_PORT = 8080;
const SERVER_HOSTNAME = 'localhost';


console.log("Starting up.");
const dataStack = new DataStack();
let connectionManager = new ConnectionManager();
const server = net.createServer((socket) => {
    console.log('Client connection attempt:', socket.remoteAddress, socket.remotePort);
    if (!connectionManager.maybeAddConnection()){
        socket.end(getResponseBusy()); //Send busy response and close socket.
    } else {
        console.log('Confirm client:', socket.remoteAddress, socket.remotePort);
    }

    let frameDecoder = new FrameDecoder();
    
    socket.on('data', (data) => {
        const { status, payload = null } = frameDecoder.handleData(data);
        if (status.complete) {
            switch (status.type) {
                case FRAME_TYPE.POP:
                    socket.end(getResponsePop(dataStack.pop())); //Send pop response and close socket.
                    console.log("Did the pop, but there's no queueing and maybe the data stack was empty.");
                    break;
                case FRAME_TYPE.PUSH:
                    dataStack.push(payload);
                    socket.end(getResponsePush()); //Send push confirm and close socket.
                    console.log("Did the push, but there's no blocking for full stack.");
                    break;
            }
        }
    })
});



console.log("Created server.");
server.listen( {port: SERVER_PORT, hostname: SERVER_HOSTNAME }, () => {
    console.log('Listening on port ' + SERVER_PORT + " and hostname: " + SERVER_HOSTNAME + ".");
});