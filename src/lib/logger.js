import pino from "pino";

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
 *
 * @param socket
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
