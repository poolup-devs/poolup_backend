
const Message = require("./message").Message;

const getMessagesInRoom = (room_id, callback) => {
    Message.find({room_id: room_id}, (err, result) => {
        if(err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}

const createMessage = ( text, room_id, callback) => {
    Message.create({
        message:text,
        room_id,
        createdAt: new Date()
    }, (err, result) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}


module.exports = {
    getMessagesInRoom,
    createMessage
}