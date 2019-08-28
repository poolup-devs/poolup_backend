use bruinpool

db.users.remove({});

user_list = [
    {
        _id: ObjectId("5d5b34c403c06e4b9ca31076"),
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "bin315a1",
        name: "Han",
        email: "bin315a1@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
        __v: 0
    }, {
        _id: ObjectId("5d5b367d03c06e4b9ca31077"),
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "justinSucks",
        name: "Justin",
        email: "justinSucks@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_pink.png",
        __v: 0
    }, {
        _id: ObjectId("5d5b368d03c06e4b9ca31078"),
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "yunaChill",
        name: "Yuna",
        email: "yunaChill@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_purple.png",
        __v: 0
    }, {
        _id: ObjectId("5d5b369a03c06e4b9ca31079"),
        verified: true,
        password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        username: "michaelSB",
        name: "Michael",
        email: "michaelSB@g.ucla.edu",
        picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png",
        __v: 0
    }
]
db.users.insertMany(user_list);