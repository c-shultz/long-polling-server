import { logger, getSocketInfo } from "./logger.js";
const TEN_SECONDS_IN_MS = 10000;

export default class ConnectionManager {
  constructor(maxConnection, deleteCallback) {
    this.connections = new Map(); // All connections will be here.
    this.maxConnection = maxConnection;
    this.deleteCallback = deleteCallback;
  }

  maybeAddConnection(socket) {
    if (this.connections.size < this.maxConnection) {
      logger.trace(
        getSocketInfo(socket),
        "Adding new socket to connection list because there's room",
      );
      this.addConnection(socket);
      return true;
    } else if (this.connections.size == this.maxConnection) {
      logger.trace(
        getSocketInfo(socket),
        "Trying to bump oldest if older than 10 seconds",
      );
      if (this.maybeRemoveOldest()) {
        logger.trace(
          getSocketInfo(socket),
          "Adding new connection after bumping oldest.",
        );
        // Successfully found an eligible old connection to bump off.
        this.addConnection(socket);
        return true;
      } else {
        logger.trace(
          getSocketInfo(socket),
          "Can't add new socket to connection list because there's nothing to bump.",
        );
        // Couldn't add
        return false;
      }
    } else {
      logger.trace(
        {
          socket: getSocketInfo(socket),
          currentConnections: this.connections.size,
        },
        "No room for new connections",
      );
      return false;
    }
  }

  maybeRemoveOldest() {
    logger.trace("Attempting to remove oldest connection.");
    const sortedConnections = [...this.connections.entries()].sort(
      ([, aProps], [, bProps]) => aProps.createdAt - bProps.createdAt,
    );
    const oldestElement = sortedConnections[0];
    const [oldestConnection, connectionProps] = oldestElement;

    if (Date.now() - connectionProps.createdAt >= TEN_SECONDS_IN_MS) {
      logger.trace("Successfully removed oldest connection.");
      this.removeConnection(oldestConnection);
      return true;
    } else {
      logger.trace("No old enough connection to remove.");
      return false;
    }
  }

  addConnection(socket) {
    logger.debug(getSocketInfo(socket), "Add connection to list.");
    this.connections.set(socket, {
      createdAt: Date.now(),
    });
  }
  removeConnection(socket) {
    logger.debug(getSocketInfo(socket), "Remove connection from list.");
    this.deleteCallback(socket);
    this.connections.delete(socket);
  }
}
