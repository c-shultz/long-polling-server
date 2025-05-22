
const MAX_STACK_SIZE = 100;

export default class DataStack{
    constructor()
    {
        this.stack = [];
    }

    push(val)
    {
        if (this.stack.length < MAX_STACK_SIZE) {
            this.stack.push(val);
            return true;
        } else {
            return false;
        }
    }

    pop()
    {
        return this.stack.pop();
    }
    
}