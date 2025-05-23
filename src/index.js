import net from "node:net";
import ConnectionManager from "./lib/connection_manager.js";
import {
  getResponseBusy,
  getResponsePush,
  getResponsePop,
  FRAME_TYPE,
} from "./lib/utils.js";
import FrameDecoder from "./lib/frame_decoder.js";
import DataStack from "./lib/data_stack.js";

const SERVER_PORT = 8080;
const SERVER_HOSTNAME = "localhost";
const MAX_CONNECTIONS = 100;

console.log("Starting up.");
const dataStack = new DataStack(MAX_CONNECTIONS);
let connectionManager = new ConnectionManager(MAX_CONNECTIONS, (socket) => {
  if (socketFullyOpen(socket)) {
    // Handle sockets that get deleted by the connection manager (because they are getting bumped off)
    socket.destroy(); //No busy-state signal needed since this is just getting bumped.
  }
});

function socketFullyOpen(socket) {
  return socket.readable && socket.writable;
}

const server = net.createServer((socket) => {
  console.log(
    "Client connection attempt:",
    socket.remoteAddress,
    socket.remotePort,
  );
  if (!connectionManager.maybeAddConnection(socket)) {
    console.log("No room for:", socket.remoteAddress, socket.remotePort);
    if (socketFullyOpen(socket)) {
      socket.end(getResponseBusy()); //Send busy response and close socket.
    }
    console.log("Ended socket for:", socket.remoteAddress, socket.remotePort);
  } else {
    console.log("Confirm client:", socket.remoteAddress, socket.remotePort);
  }

  let frameDecoder = new FrameDecoder();

  socket.on("data", (data) => {
    let cancelPopRequest, cancelPushRequest;
    console.log(
      "Got some data from client:",
      socket.remoteAddress,
      socket.remotePort,
    );
    if (!socketFullyOpen(socket)) {
      console.log(
        "socket not readable or writable for:",
        socket.remoteAddress,
        socket.remotePort,
      );
      return;
    }
    const { status, payload = null } = frameDecoder.handleData(data);
    if (status.complete) {
      switch (status.type) {
        case FRAME_TYPE.POP:
          cancelPopRequest = dataStack.requestPop((payload) => {
            console.log(
              "Popping data off for client:",
              socket.remoteAddress,
              socket.remotePort,
            );
            socket.end(getResponsePop(payload)); //Send pop response and close socket.
          });
          break;
        case FRAME_TYPE.PUSH:
          cancelPushRequest = dataStack.requestPush(payload, () => {
            console.log(
              "Pushing data onto stack for client:",
              socket.remoteAddress,
              socket.remotePort,
            );
            socket.end(getResponsePush()); //Send push confirm and close socket.
          });
          break;
      }
    }
    socket.on("end", () => {
      console.log("Socket end for:", socket.remoteAddress, socket.remotePort);
      //A little cleanup in case connections closed before queued pushes/pops could be serviced.
      if (typeof cancelPopRequest === "function") {
        cancelPopRequest();
        console.log(
          "Cancelling pending pop request for:",
          socket.remoteAddress,
          socket.remotePort,
        );
      }
      if (typeof cancelPushRequest === "function") {
        cancelPushRequest();
        console.log(
          "Cancelling pending push request for:",
          socket.remoteAddress,
          socket.remotePort,
        );
      }
    });
    socket.on("error", () => {
      console.log("unknown error i guess");
    });

    //Remove connection for any possible full/partial socket closures.
    const removeOnClose = () => {
      connectionManager.removeConnection(socket);
    };
    ["close", "end", "finish"].forEach((eventName) => {
      socket.once(eventName, removeOnClose);
    });
  });
});

console.log("Created server.");
server.listen({ port: SERVER_PORT, hostname: SERVER_HOSTNAME }, () => {
  console.log(
    "Listening on port " +
      SERVER_PORT +
      " and hostname: " +
      SERVER_HOSTNAME +
      ".",
  );
});
