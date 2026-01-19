/**
 * ONE-TIME RESET SCRIPT for X3D DENTAL
 * Usage: Run with 'node reset_x3d.js' (Must have local server running first)
 */

const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/branch/X3D%20DENTAL', // URL Encoded "X3D DENTAL"
    method: 'DELETE'
};

console.log('Sending reset command for "X3D DENTAL"...');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);
        console.log('\n=============================================');
        console.log('RESET COMPLETE. OLD DATA WIPED.');
        console.log('Now DEPLOY the updated code to production.');
        console.log('=============================================');
    });
});

req.on('error', (error) => {
    console.error('Error:', error.message);
    console.log('Is the server running? (npm start)');
});

req.end();
