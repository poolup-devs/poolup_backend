'use strict';
const fs = require('fs');
fs.mkdir('config', {recursive: true}, (e) => {
    if (e) {
        console.log("Could not create config directory!")
        throw e
    }
}) 
// fs.createReadStream('.sample_env').pipe(fs.createWriteStream('config/dev.env'));
// fs.createReadStream('.sample_env').pipe(fs.createWriteStream('config/test.env'));

fs.createReadStream('.sample_env').pipe(fs.createWriteStream('config/.env-cmdrc'));