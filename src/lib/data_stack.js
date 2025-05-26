import { logger } from "./logger.js";
import EventEmitter from "node:events";

const MAX_STACK_SIZE = 100;

export default class DataStack {
  constructor(maxConnections) {
    this.stack = [];
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(maxConnections);
  }

  requestPush(val, pushCallback) {
    logger.debug(
      {
        stackSize: this.stack.length,
        data: val,
      },
      "Request to push to stack.",
    );
    if (this.stack.length < MAX_STACK_SIZE) {
      logger.debug("Pushing since there's on the stack.");
      this.stack.push(val);
      pushCallback();
      this.emitter.emit("push");
    } else {
      logger.debug("Full stack, so we'll wait for a pop event.");
      const queuedCallback = () => this.requestPush(val, pushCallback);
      this.emitter.on("pop", queuedCallback);
      return () => this.emitter.removeListener("pop", queuedCallback);
    }
  }

  requestPop(popCallback) {
    logger.debug(
      { stackSize: this.stack.length },
      "Request to pop from stack.",
    );
    if (this.stack.length > 0) {
      logger.debug("Popping since there's something on the stack.");
      popCallback(this.stack.pop());
      this.emitter.emit("pop");
    } else {
      logger.debug("Stack empty, nothing to pop so we'll wait for a push.");
      const queuedCallback = () => this.requestPop(popCallback);
      this.emitter.on("push", queuedCallback);
      return () => this.emitter.removeListener("push", queuedCallback);
    }
  }
}
