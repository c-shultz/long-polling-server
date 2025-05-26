import { logger, getSocketInfo } from "./logger.js";
import { Socket } from "node:net";

const TEN_SECONDS_IN_MS = 10000;

/**
 * Class to manage the addition and removal of connections.
 */
export default class ConnectionManager {
  /**
   * Constructor.
   * @param {number} maxConnections   - Maximum number allowed connections.
   * @param {Function} deleteCallback - Callback for when old connections are bumped.
   */
  constructor(maxConnections, deleteCallback) {
    this.connections = new Map();
    this.maxConnections = maxConnections;
    this.deleteCallback = deleteCallback;
  }

  /**
   * Try to add provide socket to connection list.
   *
   * Connection is added immediately if there's room. If there's not room:
   *   - Bumpable connection will be removed before adding new connection, or
   *   - Connection will not be added.
   * @param {Socket} socket - A socket object to add to connection list.
   * @returns {boolean}     - True if successful, false if there's no room.
   */
  maybeAddConnection(socket) {
    if (this.connections.size < this.maxConnections) {
      logger.trace(
        getSocketInfo(socket),
        "Adding new socket to connection list because there's room",
      );
      this.#addConnection(socket);
      return true;
    } else if (this.connections.size == this.maxConnections) {
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
        this.#addConnection(socket);
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

  /**
   * Try to remove a connection if there is one older than 10 seconds.
   * @returns {boolean} - True if a connection was removed, false if not.
   */
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

  /**
   * Immediately add connection without checking if there's room.
   *
   * This should not be called without first checking for connection space.
   * @param {Socket} socket - Socket to add immediately.
   */
  #addConnection(socket) {
    logger.debug(getSocketInfo(socket), "Add connection to list.");
    this.connections.set(socket, {
      createdAt: Date.now(),
    });
  }
  /**
   * Immediately remove connection and notify using this.deleteCallback.
   * @param {Socket} socket - Socket to remove.
   */
  removeConnection(socket) {
    logger.debug(getSocketInfo(socket), "Remove connection from list.");
    this.deleteCallback(socket);
    this.connections.delete(socket);
  }
}
