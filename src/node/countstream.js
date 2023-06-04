const Writable = require('stream').Writable

class CountStream extends Writable {
    constructor(matchText, option){
        super(option);
        this.count = 0;
        this.matcher = new RegExp(matchText);
    }
    _write(chunk, encoding, cb){
        const matches = chunk.toString().match(this.matcher);
        if(matches){
            this.count += matches.length;
        }
        cb();
    }
    end(){
        this.emit('total', this.count)
    }
}
module.exports = CountStream