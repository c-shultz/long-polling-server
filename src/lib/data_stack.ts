import { logger } from "./logger.js";
import EventEmitter from "node:events";

const MAX_STACK_SIZE = 100;

/**
 * Class to create/manage stack.
 */
export default class DataStack {
  stack: Array<Buffer>;
  emitter: EventEmitter;
  /**
   * Constructor.
   */
  constructor() {
    this.stack = []; // Simple data structure of stack. Stored objects will be Buffer object.
    // Set up emitters to handle on push and on pop events for waiting clients.
    this.emitter = new EventEmitter();
  }

  /**
   * Requests push onto stack.
   *
   * Push will be completed immediately if there's room, or will be done later
   * when a pop event is emitted. In either case, the callback will be called
   * as soon as the push is succesful. A callback is provided a return value
   * to manage even listeners. If a client is no longer waiting, it should call
   * the returned cancel callback to minimize resources.
   * @param {Buffer} val             - Buffer to push onto stack.
   * @param {Function} pushCallback  - Callback for successful push.
   * @returns {Function | undefined} - Callback to cancel push request.
   */
  requestPush(val: Buffer, pushCallback : Function) : Function | undefined {
    logger.debug(
      {
        stackSize: this.stack.length,
        data: val,
      },
      "Request to push to stack.",
    );
    if (this.stack.length < MAX_STACK_SIZE) {
      logger.debug("Pushing since there's room on the stack.");
      this.stack.push(val);
      pushCallback();
      this.emitter.emit("push"); // Signal waiting pop request.
    } else {
      // The client will have to wait for a pop to occur.
      logger.debug("Full stack, so we'll wait for a pop event.");
      const queuedCallback = () => this.requestPush(val, pushCallback);
      this.emitter.on("pop", queuedCallback);
      // Come back later when a pop has occurred.
      return () => this.emitter.removeListener("pop", queuedCallback);
    }
  }

  /**
   * Requests pop from stack.
   *
   * Pop will be completed immediately if there's something on stack, or will
   * be done later when a push is completed. In either case, the callback will be called
   * as soon as the pop is succesful. A callback is provided a return value
   * to manage even listeners: If a client is no longer waiting, it MUST call
   * the returned cancel callback to avoid throwing away popped data.
   * @param {Function} popCallback   - Callback for successful pop.
   * @returns {Function | undefined} - Callback to cancel pop request.
   */
  requestPop(popCallback: Function) : Function | undefined {
    logger.debug(
      { stackSize: this.stack.length },
      "Request to pop from stack.",
    );
    if (this.stack.length > 0) {
      logger.debug("Popping since there's something on the stack.");
      popCallback(this.stack.pop());
      this.emitter.emit("pop"); // Signal waiting push requests.
    } else {
      // The client will have to wait for a push to occur.
      logger.debug("Stack empty, nothing to pop so we'll wait for a push.");
      const queuedCallback = () => this.requestPop(popCallback);
      this.emitter.on("push", queuedCallback);
      // Come back later when a push has occurred.
      return () => this.emitter.removeListener("push", queuedCallback);
    }
  }
}
