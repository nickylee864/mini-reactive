const CountStream = require('./countstream');
const countStream = new CountStream('book');

const https = require('https');

https.get('https://www.manning.com', function(res){
    res.pipe(countStream);
})

countStream.on('total', function(count){
    console.log('Total matches: ', count)
})