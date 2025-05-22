const MAX_CONNECTIONS = 100;

export default class ConnectionManager {
    constructor() {
        this.connectionSet = new Set(); // All connections will be here.
        this.popReqQueue = []; // Connections waiting to pop.
    }

    maybeAddConnection(connection) {
        if (this.connectionSet.size < MAX_CONNECTIONS) {
            this.connectionSet.add(connection);
            return true;
        } else if (this.connectionSet.size == MAX_CONNECTIONS) {
            console.log("Bump the oldest if over ten seconds old");
            return true;
            //or maybe
            return false;
        } else {
            console.log("No room here, friends");
            return false;
        }


    }
}
