const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
    message: String,
    room_id: String,
    createdAt: {
        type:Date,
        default: new Date()
    }
})

const Message = mongoose.model("Message", messageSchema)

module.exports = { Message };