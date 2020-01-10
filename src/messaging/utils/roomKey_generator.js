const crypto = require("crypto");
require("dotenv").config();


const generateRoomKey = ( usernameA, usernameB ) => {
    const key = process.env.ROOMKEY_KEY;
    const load = usernameA < usernameB? usernameA+usernameB: usernameB+usernameA;
    const iv = process.env.ROOMKEY_IV;
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv));
    let encrypted = cipher.update(load);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted.toString("hex");
}

const decryptRoomKey = ( roomKey ) => {
    const encryptedLoad = Buffer.from(roomkey, "hex");
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key));
    const decryptedLoad = decipher.update(encryptedLoad)
    decrypted = Buffer.concat([decryptedLoad, decipher.final()]);

    return decrypted.toString();
}


module.exports = {
    generateRoomKey,
    decryptRoomKey
}