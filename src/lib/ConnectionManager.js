
export default class ConnectionManager {
    constructor(max_connections) {
        this.connectionSet = new Set(); // All connections will be here.
        this.popReqQueue = []; // Connections waiting to pop.
        this.max_connections = max_connections;
    }

    maybeAddConnection(connection) {
        if (this.connectionSet.size < this.max_connections) {
            this.connectionSet.add(connection);
            return true;
        } else if (this.connectionSet.size == this.max_connections) {
            console.log("Bump the oldest if over ten seconds old");
            return false;
            //or maybe
            return true;
        } else {
            console.log("No room here, friends");
            return false;
        }


    }
}
