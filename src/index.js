import net from 'node:net';
import ConnectionManager from './lib/ConnectionManager.js';
import { getResponseBusy, getResponsePush, getResponsePop, FRAME_TYPE } from './lib/utils.js';
import FrameDecoder from './lib/FrameDecoder.js';
import DataStack from './lib/DataStack.js';

const SERVER_PORT = 8080;
const SERVER_HOSTNAME = 'localhost';
const MAX_CONNECTIONS = 100;


console.log("Starting up.");
const dataStack = new DataStack(MAX_CONNECTIONS);
let connectionManager = new ConnectionManager(MAX_CONNECTIONS);
const server = net.createServer((socket) => {
    console.log('Client connection attempt:', socket.remoteAddress, socket.remotePort);
    if (!connectionManager.maybeAddConnection()){
        socket.end(getResponseBusy()); //Send busy response and close socket.
    } else {
        console.log('Confirm client:', socket.remoteAddress, socket.remotePort);
    }

    let frameDecoder = new FrameDecoder();
    let cancelPopRequest, cancelPushRequest;
    
    
    socket.on('data', (data) => {
        const { status, payload = null } = frameDecoder.handleData(data);
        if (status.complete) {
            switch (status.type) {
                case FRAME_TYPE.POP:
                    cancelPopRequest = dataStack.requestPop( (payload) =>{
                        socket.end(getResponsePop(payload)); //Send pop response and close socket.
                    });
                    break;
                case FRAME_TYPE.PUSH:
                    cancelPushRequest = dataStack.requestPush(payload, () => {
                        socket.end(getResponsePush()); //Send push confirm and close socket.
                    });
                    break;
            }
        }
    })
    socket.on('end', () => {
        //A little cleanup in case connections closed before queued pushes/pops could be serviced.
        if (typeof cancelPopRequest === 'function') {
            cancelPopRequest();
        }
        if (typeof cancelPushRequest === 'function') {
            cancelPushRequest();
        }

    });
});



console.log("Created server.");
server.listen( {port: SERVER_PORT, hostname: SERVER_HOSTNAME }, () => {
    console.log('Listening on port ' + SERVER_PORT + " and hostname: " + SERVER_HOSTNAME + ".");
});