require("./src/db/mongoose");
const User = require('./src/user/user').User 

User.deleteMany({}) 

user_list = [
    {
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "bin315a1",
        name: "Han",
        email: "bin315a1@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
    }, 
    {
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "justinSucks",
        name: "Justin",
        email: "justinSucks@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_pink.png",
    }, 
    {
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "yunaChill",
        name: "Yuna",
        email: "yunaChill@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_purple.png",
    }, 
    {
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "michaelSB",
        name: "Michael",
        email: "michaelSB@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png",
    }, 
    {
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "elin4046",
        name: "Evan Lin",
        email: "elin0467@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png",
    }
]
User.insertMany(user_list).then(() => {
    console.log("Successfully initialized developement database!") 
    process.exit(0)
}).catch((e) => {
    console.log(e) 
    process.exit(1)
})
