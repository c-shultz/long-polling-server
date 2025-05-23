const TEN_SECONDS_IN_MS = 10000;

export default class ConnectionManager {
  constructor(maxConnection, deleteCallback) {
    this.connections = new Map(); // All connections will be here.
    this.maxConnection = maxConnection;
    this.deleteCallback = deleteCallback;
  }

  maybeAddConnection(socket) {
    if (this.connections.size < this.maxConnection) {
      this.addConnection(socket);
      return true;
    } else if (this.connections.size == this.maxConnection) {
      console.log("Bump the oldest if over ten seconds old.");
      if (this.maybeRemoveOldest()) {
        console.log("Adding new connection after bump.");
        // Successfully found an eligible old connection to bump off.
        this.addConnection(socket);
        return true;
      } else {
        console.log("Nothing to bump, so not adding new connection.");
        // Couldn't add
        return false;
      }
    } else {
      console.log("No room here, friends.");
      return false;
    }
  }

  maybeRemoveOldest() {
    console.log("Trying to remove oldest");
    const sortedConnections = [...this.connections.entries()].sort(
      ([, aProps], [, bProps]) => aProps.createdAt - bProps.createdAt,
    );
    const oldestElement = sortedConnections[0];
    const [oldestConnection, connectionProps] = oldestElement;

    if (Date.now() - connectionProps.createdAt >= TEN_SECONDS_IN_MS) {
      this.removeConnection(oldestConnection);
      return true;
    } else {
      console.log("Nothing older than 10 seconds");
      return false;
    }
  }

  addConnection(socket) {
    console.log(
      "Add connection to list for: ",
      socket.remoteAddress,
      socket.remotePort,
    );
    this.connections.set(socket, {
      createdAt: Date.now(),
    });
  }
  removeConnection(socket) {
    console.log("Remove connection from list");
    this.deleteCallback(socket);
    this.connections.delete(socket);
  }
}
