const net = require('net');
const client = new net.Socket();
client.connect(3000, '127.0.0.1', function () {
    console.log('Port 3000 is open');
    client.destroy();
});
client.on('error', function (err) {
    console.log('Port 3000 is closed');
});
