import pino from "pino";
import { Socket } from "node:net";
import fs from "node:fs";

const LOG_FILE_APP = "app.log";
const LOG_FILE_DEBUG = "debug.log";

interface SocketInfo {
  socketAddress: string,
  socketPort: string
}

// Configure multiple logging destinations.
const streams = [
  { level: "debug", stream: fs.createWriteStream(LOG_FILE_DEBUG) }, // For 'debug'.
  { level: "info", stream: fs.createWriteStream(LOG_FILE_APP) }, // For 'info'.
];

export const logger = pino(
  {
    level: process.env.LOG_MODE || "info",
  },
  pino.multistream(streams),
);

/**
 * Get some basic human-readable identifying info from socket for logging purposes.
 * @param {Socket} socket - A socket object to get info from.
 * @returns {object}      - Params to help identify socket/client/etc.
 */
export function getSocketInfo(socket : Socket) {
  let address = "unknown";
  let port = "unknown"; 
  if ("remoteAddress" in socket && socket.remoteAddress !== undefined) {
    address = socket.remoteAddress;
  }
  if ("remotePort" in socket && socket.remotePort !== undefined) {
    port = socket.remotePort.toString();
  }
  return {
    socketAddress: address,
    socketPort: port,
  };
}

/**
 * Get string with basic info about log file(s).
 * @returns {string} - Info string.
 */
export function getLogFileInfo() : string {
  let info = "Logging to: " + LOG_FILE_APP;
  if (process.env.LOG_MODE === "debug") {
    info += "\nDebug mode enabled, so also logging to " + LOG_FILE_DEBUG;
  }
  return info;
}
