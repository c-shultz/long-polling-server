import net from 'node:net';
import ConnectionManager from './lib/ConnectionManager.js';

const SERVER_PORT = 8080;
const SERVER_HOSTNAME = 'localhost';

const RESPONSE_BUSY = 0xFF;
const RESPONSE_PUSH = 0x00;

console.log("Starting up.");
const stack = [];
let connectionManager = new ConnectionManager();
const server = net.createServer((socket) => {
    let handleData = connectionManager.addConnection({
        onPush: (buffer) => {
            console.log("Trying to ack push.");
            stack.push(buffer);
            socket.write([RESPONSE_PUSH]);
        },
        onPop: () => {
            console.log("Tried to pop, but this is broken.");
        },
        onBusy: () => {
            console.log("Tried to respond busy, but this is broken.");
            socket.write([RESPONSE_BUSY]);
        },
    });
    socket.on('data', handleData); // Pass incoming Buffer object to connectionManager to be processed.

    /*
    connection = startConnection(socket);
    connection.on('push', (payload) => {console.log("Push it onto stack.")})
    connection.on('pop', () => {console.log("Pop it off of stack.")})
    connection.on('bump', () => {console.log("Too slow. You lose.")})
    connection.on('error', () => {console.log("Malformed.")})
    */
    

    socket.on('connect', () => {
        console.log('Connection!');
    });
});



console.log("Created server.");
server.listen( {port: SERVER_PORT, hostname: SERVER_HOSTNAME }, () => {
    console.log('Listening on port ' + SERVER_PORT + " and hostname: " + SERVER_HOSTNAME + ".");
});