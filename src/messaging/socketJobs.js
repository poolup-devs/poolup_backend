
const db = require("./controller.js");
const jwt = require("jsonwebtoken");
const {generateMessage, generateLocationMessage} = require("./utils/messages.js")
const {generateRoomKey, decryptRoomKey} = require("./utils/roomKey_generator.js")

let count = 0;                                  // temp variable
// const {generateMessage, generateLocationMessage} = require("../utils/messages.js")
// const { addUser, removeUser, getUser, getUsersInRoom } = require("../utils/users.js")

module.exports = function(io) {
    io.on("connection", (socket)=> {                        // on an event; everytime there's a connection; socket: object that contains info about that connection
    console.log("new websocket connection")
                                                        // all param after first arg is available from the client's fallback
    
    socket.on("join", ({userA, userB}, callback) =>{
        // const { error, user } = addUser({ id: socket.id, username, room})  // I can have either error or user

        // if (error) {
        //     return callback(error)
        // }
        // const roomKey = jwt.sign({ userA:userA, userB: userB }, JWT_MESSAGEROOM_KEY);
        // const roomKey = userA + userB;
        const roomKey = generateRoomKey(userA, userB);

        console.log(roomKey)
        socket.join(roomKey)       //allows to join the given chatroom of the room name
        
        socket.emit("message", generateMessage("Admin", "Welcome!"))

        // db.createMessage("Welcome!", roomKey, (err, data) => {
        //     if (err) {
        //         console.log("Error")
        //     }
        // })

        socket.broadcast.to(roomKey).emit("message", generateMessage("Admin", `Someone else has joined!`))

        callback()
    })

    // Fix this so that two usernames are passed in for the socket request
    socket.on("sendMessage", (message, callback)=> {
        // const user = getUser(socket.id)
        roomKey = generateRoomKey("admin", "bin315a1")

        db.createMessage(message, roomKey, (err, data) => {
            if (err) {
                console.log("Error")
            }
        })

        io.to(roomKey).emit("message", generateMessage(roomKey, message))
        callback()
    })

//     socket.on("increment", () => {
//         count++;
// //        socket.emit("countUpdated", count)            // emits only to the specific connection
//         io.emit("countUpdated", count)                 // emits to all the connections in the io group
//     })

//     socket.on("sendLocation", (coords, callback)=>{
//         const user = getUser(socket.id)
//         io.to(user.room).emit("locationMessage", generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
//         callback()
//     })

//     socket.on("disconnect", () => {                         // notice that Connection is done w/ io.on(), but this is w/ socket.on()
//         const user = removeUser(socket.id)
//         if(user) {
//             io.to(user.room).emit("message", generateMessage("Admin", `${user.username} has left!`))
//         }

//     })
})


}