const mongoose = requre("mongoose");
const request = require('supertest');

require("../../src/db/mongoose");
const db = require("../../src/request/controller.js")

const Request = require("../../src/request/request").Request
const Ride = require('../../src/ride/ride').Ride
const User = require('../../src/user/user').User
const jwt = require("jsonwebtoken");

const app = require('../../src/app')

describe("Testing request controller methods", () => {

    const curr_date = new Date();
    const future_date = new Date();
    future_date.setDate(future_date.getDate() + 100)
    const past_date = new Date();
    past_date.setDate(past_date.getDate() - 100)

    const userList = [
        {
            isRegistered: true, 
            password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            username: "driver1",
            firstName: "driver1",
            email: "driver1-noreply@g.ucla.edu",
            picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
        },
        {
            isRegistered: true, 
            password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            username: "rider1",
            firstName: "rider1",
            email: "rider2@g.ucla.edu",
            picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
        }, 
        {
            isRegistered: true, 
            password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            username: "rider2",
            firstName: "rider2",
            email: "rider2@g.ucla.edu",
            picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_pink.png",
        }
    ]

    const rideList = [
        {
            "ownerEmail": "driver1@g.ucla.edu",
            "ownerUsername": "driver1",
            "ownerPhoneNumber": "1231231234",
            "from": "Irvine",
            "to": "Los Angeles",
            "date": future_date.toDateString(),
            "price": "20",
            "seats": 4,
            "detail": "driver1_future",
            "passengers": ["rider1"]
        }
    ]

    beforeEach( async() => {
        await User.create(userList);
        return;
    });
    afterEach( async () => {
        await User.deleteMany();
        await Request.deleteMany();
        return;
    })

    describe("Test createRequest method", () => {
        const ride1 = await Ride.findOne({ownerUsername: "driver1"});
        const requestObj = {
            rideID: ride1._id,
            requesterUsername: "rider2",
            requesteeUsername: "driver1",
            date: new Date()
        }

        beforeEach( async() => {
            await Ride.create(rideList);
            db.createRequest(requestObj);
        })
        afterEach( async() => {
            await Ride.deleteMany();
            await Request.deleteMany();
            return;
        })

        test("If a user is already in the ride, they cannot make a request for that ride", async(done) => {

        })

        test("When a request is pending, requester cannot make another request for the same ride", async (done) => {

        })

        test("If the ride is cancelled while the request is pending, the request is deleted", async (done) => {

        })
    })

    describe("Test updateStatus method", () => {
        const ride1 = await Ride.findOne({ownerUsername: "driver1"});
        const requestObj = {
            rideID: ride1._id,
            requesterUsername: "rider2",
            requesteeUsername: "driver1",
            date: new Date()
        }
        // const request1 = await db.createRequest()
        beforeEach( async() => {
            await Ride.create(rideList);
            db.createRequest(requestObj);
        })
        afterEach( async() => {
            await Ride.deleteMany();
            await Request.deleteMany();
            return;
        })
        
        describe("Testing accepted status cases", () => {
            await db.updateRequestStatus(...)
            test("Testing accepted request", async (done) => {
            
            })
            test("Calling statusUpdate method to a request that had been accepted (requester is in the ride)", async (done) => {
            
            })
        })
        describe("Testing denied status cases", () => {
            db.updateRequestStatus(...)
            test("Testing deny request", async (done) => {
            
            })
            test("Calling statusUpdate method to a request that had been denied", async (done) => {
            
            })
        })
        describe("Testing cancelled status cases", () => {
            db.updateRequestStatus(...)
            test("Testing cancelled request", async (done) => {
            
            })
            test("Calling statusUpdate method to a request that had been cancelled", async (done) => {
            
            })
        })

        describe ("Testing archived cases", () => {
            db.archiveRequest(...)
            test("Calling statusUpdate method to a request that had been archived", async (done) => {
            
            })

            test("Archived requests aren't 'visible' by both requester and requestee", async (done) => {

            })
        })
    })
})