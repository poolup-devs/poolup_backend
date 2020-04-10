require("../src/db/mongoose");
const chalk = require("chalk")

const User = require('../src/user/user').User 
const Ride = require("../src/ride/ride.js").Ride
// Used to execute shell commands 
var spawn = require('child_process').spawn;

const userSeed = () =>
{
    return User.deleteMany({}).then((res, err) => {
        user_list = [
            {
                verified: true,
                password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                username: "admin",
                firstName: "admin",
                email: "admin-noreply@g.ucla.edu",
                picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
            },
            {
                verified: true,
                password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                username: "user1",
                firstName: "user1",
                email: "user1@g.ucla.edu",
                picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
            }, 
            {
                verified: true,
                password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                username: "user2",
                firstName: "user2",
                email: "user2@g.ucla.edu",
                picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_pink.png",
            }, 
            {
                verified: true,
                password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                username: "user3",
                firstName: "user3",
                email: "user3@g.ucla.edu",
                picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_purple.png",
            }, 
            {
                verified: true,
                password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                username: "user4",
                firstName: "user4",
                email: "user4@g.ucla.edu",
                picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png",
            }
        ]
        try {
            User.insertMany(user_list).then(() => {
                console.log(chalk.green("[DB_INIT]: ") + "Successfully initialized development database - User!")
                rideSeed();
            })
        }
        catch(e) {
            console.log(err) 
            process.exit(1)
        }
    }).catch((e) => {
        console.log(chalk.red("[ERROR]: ")+"Could not delete all existing documents in User")
    });
}

// Ride Seed
const rideSeed = () => {
    return Ride.deleteMany({}).then((res, err) => {

        const curr_date = new Date();
        const future_date = new Date();
        future_date.setDate(future_date.getDate() + 2)
        const past_date = new Date();
        past_date.setDate(past_date.getDate() - 2)
    
        ride_list = [
            {
                "ownerEmail": "user1@g.ucla.edu",
                "ownerUsername": "user1",
                "ownerPhoneNumber": "1231231234",
                "from": "Irvine",
                "to": "Los Angeles",
                "date": future_date.toDateString(),
                "price": "20",
                "seats": 4,
                "detail": "driver1_future",
                "passengers": ["user2","user3"]
            },
            {
                "ownerEmail": "user1@g.ucla.edu",
                "ownerUsername": "user1",
                "ownerPhoneNumber": "1231231234",
                "from": "Irvine",
                "to": "Los Angeles",
                "date": past_date.toDateString(),
                "price": "20",
                "seats": 4,
                "detail": "driver1_history",
                "passengers": ["user2","user3"]
            },  
            {
                "ownerEmail": "user4@g.ucla.edu",
                "ownerUsername": "user4",
                "ownerPhoneNumber": "1231231234",
                "from": "Los Angeles",
                "to": "Irvine",
                "date": future_date.toDateString(),
                "price": "20",
                "seats": 4,
                "detail": "rider1_future",
                "passengers": ["user1"]
            },
            {
                "ownerEmail": "user4@g.ucla.edu",
                "ownerUsername": "user4",
                "ownerPhoneNumber": "1231231234",
                "from": "Los Angeles",
                "to": "Irvine",
                "date": past_date.toDateString(),
                "price": "20",
                "seats": 4,
                "detail": "rider1_past",
                "passengers": ["user1"]
            },
            {
                "ownerEmail": "user2@g.ucla.edu",
                "ownerUsername": "user2",
                "ownerPhoneNumber": "1231231234",
                "from": "Los Angeles",
                "to": "Irvine",
                "date": past_date.toDateString(),
                "price": "20",
                "seats": 4,
                "detail": "rider1_past, driver2_past",
                "passengers": ["user1"]
            },
            {
                "ownerEmail": "user2@g.ucla.edu",
                "ownerUsername": "user2",
                "ownerPhoneNumber": "1231231234",
                "from": "Los Angeles",
                "to": "Irvine",
                "date": future_date.toDateString(),
                "price": "20",
                "seats": 4,
                "detail": "rider1_future, driver2_future",
                "passengers": ["user1"]
            }
        ]
        try {
            Ride.insertMany(ride_list).then(()=>{
                console.log(chalk.green("[DB_INIT]: ") + "Successfully initialized development database - Ride!")
                seedSchool()
            })
        }
        catch(e) {
            console.log(err) 
            process.exit(1)
        }
    }).catch((e) => {
        console.log(chalk.red("[ERROR]: ")+"Could not delete all existing documents in Ride")
    })
}

// Seed schools collection used to parse emails for the school the user attends 
const seedSchool = () => {
    var child = spawn('mongoimport --db poolup-dev --collection schools --file ./setup/schoolEmails.json --jsonArray --drop' + 
    '&&  mongoimport --db poolup-test --collection schools --file ./setup/schoolEmails.json --jsonArray --drop', 
    {
        shell: true
    });

    child.stderr.on('data', function (data) {
        console.error(data.toString().trim());
    });
    child.on('exit', function (exitCode) {
        if (exitCode == 0) {
            console.log(chalk.green("[DB_INIT]: ") + "Successfully initialized test and development database - Schools!")
        }
        else {
            console.log(chalk.red("[ERROR]: ")+"Database could not be initialized with the Schools collection!")
        }
        process.exit(exitCode)
    });
}

userSeed();