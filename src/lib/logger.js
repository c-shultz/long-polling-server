import pino from "pino";
import { Socket } from "node:net";

const prettyTransport = {
  target: "pino-pretty", // the module name
  options: {
    colorize: true,
  },
};

export const logger = pino({
  level: process.env.LOG_LEVEL || "trace",
  transport: prettyTransport,
});

/**
 * Get some basic human-readable identifying info from socket for logging purposes.
 * @param {Socket} socket - A socket object to get info from.
 * @returns {object}      - Params to help identify socket/client/etc.
 */
export function getSocketInfo(socket) {
  let address = "unknown";
  let port = "unknown";
  if ("remoteAddress" in socket) {
    address = socket.remoteAddress;
  }
  if ("remotePort" in socket) {
    port = socket.remotePort;
  }
  return {
    socketAddress: address,
    socketPort: port,
  };
}
