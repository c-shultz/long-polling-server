import net from "node:net";
import ConnectionManager from "./lib/connection_manager.js";
import {
  getResponseBusy,
  getResponsePush,
  getResponsePop,
  isSocketFullyOpen,
  FRAME_TYPE,
} from "./lib/utils.js";
import FrameDecoder from "./lib/frame_decoder.js";
import DataStack from "./lib/data_stack.js";
import { logger, getSocketInfo, getLogFileInfo } from "./lib/logger.js";
import events from "node:events";

const SERVER_PORT = 8080;
const SERVER_HOSTNAME = "localhost";
const MAX_CONNECTIONS = 100;

// The server is heavily event driven so there can easily be more
// listeners than the default max of '10'. Without increasing this,
// the EventEmitter logs warnings. We shouldn't expect more listeners
// than there are connections for any given emitter.
events.defaultMaxListeners = MAX_CONNECTIONS;

logger.info("Starting up.");
const dataStack = new DataStack();
let connectionManager = new ConnectionManager(MAX_CONNECTIONS, (socket) => {
  if (isSocketFullyOpen(socket)) {
    // Handle sockets that get deleted by the connection manager (because they are getting bumped off)
    socket.destroy(); // No busy-state signal needed since this is just getting bumped.
  }
});

const server = net.createServer((socket) => {
  logger.debug(
    "Client connection attempt:",
    socket.remoteAddress,
    socket.remotePort,
  );

  // Attempt to add incoming socket to connection list.
  if (!connectionManager.maybeAddConnection(socket)) {
    logger.debug(getSocketInfo(socket), "No room for socket");
    if (isSocketFullyOpen(socket)) {
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

  // Handle incoming data events (frames may come all at once or be split up).
  let frameDecoder = new FrameDecoder();
  socket.on("data", (data) => {
    let cancelPopRequest, cancelPushRequest;
    logger.trace([getSocketInfo(socket), data], "Got some data from client.");
    if (!isSocketFullyOpen(socket)) {
      logger.trace(getSocketInfo(socket), "Socket not readable or writable.");
      return;
    }

    // Try to parse incoming data, or just ignore client if there's decoding error.
    let status, payload;
    try {
      ({ status, payload = null } = frameDecoder.handleData(data));
    } catch (err) {
      logger.error([err, socket], "Error decoding data. Ending socket.");
      socket.end();
      return;
    }

    // If we've finished receiving all data for this connection.
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

    // A little cleanup in case connections closed before queued pushes/pops could be serviced.
    socket.on("end", () => {
      logger.debug(getSocketInfo(socket), "Socket end event");
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

    // Log other errors.
    socket.on("error", (err) => {
      // ECONNRESET is expected when the remote client disconnects unexpectly. We'll log and continue.
      if (err.code === 'ECONNRESET') {
        logger.error(err, "Client disconnected.");
      } else {
        logger.fatal(err);
        throw err;
      }
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
  console.log("Server started and listening on " + SERVER_HOSTNAME + " " + SERVER_PORT);
  console.log(getLogFileInfo());
});
