import EventEmitter from "node:events";

const MAX_STACK_SIZE = 100;

export default class DataStack {
  constructor(max_connections) {
    this.stack = [];
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(max_connections);
  }

  requestPush(val, pushCallback) {
    console.log("Request to push to stack. Stack size: " + this.stack.length);
    if (this.stack.length < MAX_STACK_SIZE) {
      console.log("Room on stack");
      this.stack.push(val);
      pushCallback();
      this.emitter.emit("push");
    } else {
      console.log("No room on stack");
      const queuedCallback = () => this.requestPush(val, pushCallback);
      this.emitter.on("pop", queuedCallback);
      return () => this.emitter.removeListener("pop", queuedCallback);
    }
  }

  requestPop(popCallback) {
    console.log("Request to pop from stack. Stack size: " + this.stack.length);
    if (this.stack.length > 0) {
      console.log("Data on stack.");
      popCallback(this.stack.pop());
      this.emitter.emit("pop");
    } else {
      console.log("Stack empty.");
      const queuedCallback = () => this.requestPop(popCallback);
      this.emitter.on("push", queuedCallback);
      return () => this.emitter.removeListener("push", queuedCallback);
    }
  }
}
