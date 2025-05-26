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
import { logger, getSocketInfo } from "./lib/logger.js";

const SERVER_PORT = 8080;
const SERVER_HOSTNAME = "localhost";
const MAX_CONNECTIONS = 100;

logger.info("Starting up.");
const dataStack = new DataStack(MAX_CONNECTIONS);
let connectionManager = new ConnectionManager(MAX_CONNECTIONS, (socket) => {
  if (socketFullyOpen(socket)) {
    // Handle sockets that get deleted by the connection manager (because they are getting bumped off)
    socket.destroy(); // No busy-state signal needed since this is just getting bumped.
  }
});

function socketFullyOpen(socket) {
  return socket.readable && socket.writable;
}

const server = net.createServer((socket) => {
  logger.debug(
    "Client connection attempt:",
    socket.remoteAddress,
    socket.remotePort,
  );
  if (!connectionManager.maybeAddConnection(socket)) {
    logger.debug(getSocketInfo(socket), "No room for socket");
    if (socketFullyOpen(socket)) {
      socket.end(getResponseBusy()); // Send busy response and close socket.
    }
    logger.debug(
      getSocketInfo(socket),
      "Ended socket for:",
      socket.remoteAddress,
      socket.remotePort,
    );
  } else {
    logger.debug(getSocketInfo(socket), "Confirm client");
  }

  let frameDecoder = new FrameDecoder();

  socket.on("data", (data) => {
    let cancelPopRequest, cancelPushRequest;
    logger.trace([getSocketInfo(socket), data], "Got some data from client.");
    if (!socketFullyOpen(socket)) {
      logger.trace(getSocketInfo(socket), "Socket not readable or writable.");
      return;
    }
    let status, payload;
    try {
      ({ status, payload = null } = frameDecoder.handleData(data));
    } catch (err) {
      logger.error([err, socket], "Error decoding data. Ending socket.");
      socket.end();
      return;
    }
    if (status.complete) {
      switch (status.type) {
        case FRAME_TYPE.POP:
          cancelPopRequest = dataStack.requestPop((payload) => {
            logger.trace(getSocketInfo(socket), "Popping data off for client");
            socket.end(getResponsePop(payload)); // Send pop response and close socket.
          });
          break;
        case FRAME_TYPE.PUSH:
          cancelPushRequest = dataStack.requestPush(payload, () => {
            logger.trace(
              getSocketInfo(socket),
              "Pushing data onto stack for client",
            );
            socket.end(getResponsePush()); // Send push confirm and close socket.
          });
          break;
      }
    }
    socket.on("end", () => {
      logger.debug(getSocketInfo(socket), "Socket end event");
      // A little cleanup in case connections closed before queued pushes/pops could be serviced.
      if (typeof cancelPopRequest === "function") {
        cancelPopRequest();
        logger.debug(
          getSocketInfo(socket),
          "Cancelling pending pop request for socket",
        );
      }
      if (typeof cancelPushRequest === "function") {
        cancelPushRequest();
        logger.debug(
          getSocketInfo(socket),
          "Cancelling pending push request for",
        );
      }
    });
    socket.on("error", (err) => {
      logger.error(err, "Socket error.");
    });

    // Remove connection for any possible full/partial socket closures.
    const removeOnClose = () => {
      logger.trace(
        getSocketInfo(socket),
        "Cleaning up connection records for socket.",
      );
      connectionManager.removeConnection(socket);
    };
    ["close", "end", "finish"].forEach((eventName) => {
      socket.once(eventName, removeOnClose);
    });
  });
});

server.on("error", (err) => {
  logger.fatal(err, "Fatal server error. Shutting down.");
  throw err;
});

const serverConfig = { port: SERVER_PORT, hostname: SERVER_HOSTNAME };
logger.info(serverConfig, "Creating server.");
server.listen({ port: SERVER_PORT, hostname: SERVER_HOSTNAME }, () => {
  logger.info(serverConfig, "Listening now.");
});
