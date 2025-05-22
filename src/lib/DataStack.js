import EventEmitter from "node:events";

const MAX_STACK_SIZE = 100;

export default class DataStack{
    constructor(max_connections)
    {
        this.stack = [];
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(max_connections)
    }

    requestPush(val, pushCallback)
    {
        if (this.stack.length < MAX_STACK_SIZE) {
            this.stack.push(val);
            pushCallback();
            this.emitter.emit('push');
        } else {
            const queuedCallback = () => this.requestPush(val, pushCallback);
            this.emitter.on('pop', queuedCallback);
            return () => this.emitter.removeListener('pop', queuedCallback);
        }
    }

    requestPop(popCallback)
    {
        if (this.stack.length > 0) {
            popCallback(this.stack.pop());
            this.emitter.emit('pop');
        } else {
            const queuedCallback = () => this.requestPop(popCallback);
            this.emitter.on('push', queuedCallback);
            return () => this.emitter.removeListener('push', queuedCallback);
        }
    }
    
}