// const generateMessage = ( username, text) => {
//     return {
//         username,
//         text,
//         createdAt: new Date().getTime()
//     }
// }

const generateMessage = ( roomkey, text) => {
    return {
        roomkey,
        text,
        createdAt: new Date().getTime()
    }
}

const generateLocationMessage = (username, url) => {
    return{
        username,
        url,
        createdAt: new Date().getTime()
    }
}

module.exports = {
    generateMessage,
    generateLocationMessage
}

