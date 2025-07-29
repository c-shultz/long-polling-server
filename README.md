# long-polling-server

## About
This is networking learning/demo project that implements a long-polling based service allowing clients to push data payloads from 1-127 bytes long onto a stack and also pop the top payload off of the stack. This is built as an event-driven NodeJS Application with a few key files within `src` directory:
- `index.js`: Implements initialization and controller to listen for incoming connections/data and send final responses to clients.
- `lib/connection_manager.js`: Manages client connection list and enforces connection limit, and the bumping old connections when needed.
- `lib/frame_decoder.js`: Decodes incoming data events into logical frames (either as push or pop requests).
- `lib/data_stack.js`: Event driven stack class that enqueues incoming pop/push requests.
- `lib/logger.js`: Uses pino for logging to `app.log`.
- `lib/utils.js`: A library of lower-level data and byte handling utility functions.

## Setup
### Installation
- Install Node.js NVM:
    - Install `nvm` (see https://github.com/nvm-sh/nvm).
    - Run `nvm use` (and `nvm install` if required version is missing).
- Run `npm install` to install all dependencies.

## Running/Testing
### Run Service
- Run `npm run start` to start service on `localhost` and listening on port `8080`.
    - Logs available at `app.log`.
- OR, run `npm run debug` (NodeJS debugger port `9229`)
    - More verbose logging in `debug.log`.

#### Development and Testing
- Linting: run `npm run lint` and/or `npm run lint:fix` to scan for and fix issues.
- Jest tests: `npm run test:jest` to run JS unit tests.


## Stack Server Problem Statement
A network-based service maintains a last-in, first-out queue accessible over a TCP connection. Clients can send commands to either add data to the queue or retrieve the most recently added item. If the queue is full or empty, the server holds the client connection open until the operation becomes possible.

The server handles client requests in the order they are fully received, not simply when the connection is established. To prevent resource exhaustion, it limits the number of active connections. If this limit is reached, new clients are normally rejected with a simple error response.

However, in cases where all active clients are blocked waiting for an operation that can't proceed (e.g., all waiting to retrieve data), the server can forcibly close the longest-standing connection—if it's been idle for a certain duration—to make room for new requests. This prevents system deadlock.

Client messages and server responses follow a minimal binary protocol with small headers indicating intent and payload size. Network byte order is used for transmission.
