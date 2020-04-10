require("../../src/db/mongoose");

const User = require("../../src/user/user").User 
const Ride = require("../../src/ride/ride").Ride 
const Noti = require("../../src/noti/noti").Noti 
const Review = require("../../src/review/review").Review 

const app = require('../../src/app')
const request = require('supertest') 
const db = require("../../src/user/controller.js");
const sha256 = require("sha256");
const jwt = require("jsonwebtoken");


const parseDomain = require('parse-domain')


describe("Testing users without existing accounts", () => {
    test("When signing up a new user, a new user should be added to the database with a firstName, username, password, email, and an unverified status.", async () => {
        const newUser = await db.signup({
            firstName: "John", 
            lastName: "Smith",
            username: "jsmith", 
            password: "password", 
            email: "jsmith@g.ucla.edu"
        })

        expect(newUser).toEqual(expect.objectContaining({
            firstName: "John", 
            lastName: "Smith",
            username: "jsmith", 
            password: sha256("password"), 
            email: "jsmith@g.ucla.edu", 
            verified: false
        })) 
    })

    test("When sending an POST request with an unused username to /users/signup to create a new account, should expect 201 Created response.", async () => {
        await request(app)
            .post('/users/signup')
            .send({
                username: 'testUser', 
                password: 'password', 
                email: 'jsmith@g.ucla.edu'
            })
            .expect(201) 
    })
}) 

describe('Testing users with unverified accounts', () => {
    const unverifiedUser = new User({
        firstName: "John", 
        lastName: "Smith",
        username: "unverifiedUser", 
        password: "password", 
        email: "unverifiedUser@g.ucla.edu"
    }) 

    beforeEach(async () => {
        await new User(unverifiedUser).save() 
    })
    afterEach(async () => {
        await User.deleteMany() 
    })

    test("When logging in on an account that has not been verified, should return an unverified email error.", done => {
        db.login('unverifiedUser@g.ucla.edu', sha256('password'), (err, result) => {
            expect(result).toEqual(null)
            expect(err).toEqual({ message: "user with email and password not found" }) 
            done()
        }) 
    }) 

    test("When verifying an account, should set user's verified field to true", done => {
        db.verifyEmail('unverifiedUser@g.ucla.edu', (err, result) => {
            expect(result.verified).toBe(true)
            done() 
        })
    })

    describe("Testing endpoints", () =>  {
        test("When sending an POST request to /users/login for a user that has not been verified yet, should expect a 401 authentication error response back.", async () => {
            await request(app)
                .post('/users/login')
                .send({
                    email: unverifiedUser.email, 
                    password: unverifiedUser.password
                })
                .expect(401) 
        })

        test("When sending an POST request to /users/signup with a username that is associated with an existing account that is NOT verified yet, should expect 500 error response.", async () => {
            await request(app)
                .post('/users/signup')
                .send({
                    username: unverifiedUser.username, 
                    password: 'password', 
                    firstName: "John", 
                    lastName: "Smith",
                })
                .expect(500) 
        })
    }) 
})

describe('Testing users with verified accounts', () => {
    const verifiedUser = new User({
        firstName: "John", 
        lastName: "Smith",
        username: "verifiedUser", 
        password: sha256("password"), 
        email: "verifiedUser@g.ucla.edu", 
        phoneNumber: '1231231234', 
        aboutMe: "This was my old about me.",
        verified: true 
    })

    const verifiedUserEmailAuthToken = jwt.sign({ email: verifiedUser.email }, process.env.JWT_EMAIL_KEY, { expiresIn: "24h"});
    const verifiedUserUsernameAuthToken = jwt.sign({ username: verifiedUser.username }, process.env.JWT_SECRET_KEY);

    beforeEach(async () => {
        await new User(verifiedUser).save()
    })

    afterEach(async () => {
        await User.deleteMany() 
    })

    describe("Testing signup/login/authentication functionality", () => {
        test("When logging in with an invalid password, should return an error.", done => {
            db.login(verifiedUser.email, sha256('invalid_password'), (err, result) => {
                expect(result).toEqual(null)
                expect(err).toEqual({ message: "user with email and password not found" }) 
                done()
            }) 
        })
    
        test("When logging in with correct email and password credentials, should return the user's account information.", done => {
            db.login(verifiedUser.email, sha256('password'), (err, result) => {
                expect(err).toEqual(null)
                const {firstName, lastName, username, email, verified} = verifiedUser 
                expect(result).toEqual(expect.objectContaining({
                    firstName, lastName, username, password: sha256("password"), email, verified
                })) 
                done()
            }) 
        }) 

        test("When sending an POST request to /users/login for a user with invalid password, should expect a 401 authentication error response back.", async () => {
            await request(app)
                .post('/users/login')
                .send({
                    email: verifiedUser.email, 
                    password: 'invalidPassword'
                })
                .expect(401) 
        })

        test("When sending an POST request to /users/login for a user with a valid password, should expect 200 response with authentication token.", async () => {
            await request(app)
                .post('/users/login')
                .send({
                    email: verifiedUser.email, 
                    password: 'password'
                })
                .expect(200) 
        })

        test("When sending an POST request to /users/signup with a username that has been taken to create a new account, should expect 500 error response.", async () => {
            await request(app)
                .post('/users/signup')
                .send({
                    username: verifiedUser.username, 
                    password: 'password', 
                    firstName: 'John', 
                    lastName: 'Smith'
                })
                .expect(500) 
        })

        test("When sending an GET request to /users/verify with a valid email authentication token, should expect 302 redirect response.", async () => {
            await request(app)
                .get('/users/verify')
                .query({token: verifiedUserEmailAuthToken})
                .expect(302) 
        })

        test("When sending an GET request to /users/verify with an invalid email authentication token, should expect 401 response.", async () => {
            await request(app)
                .get('/users/verify')
                .query({token: 'wrongTokenValue'})
                .expect(401) 
        })

        describe("Testing the validation of new account information during signup", () => {
            test("When a user tries to sign-up for an account that needs to be verified via email, should result in an error", async () => {
                const unverifiedUser = await User.create({email: "test@ucla.edu", username: "testUsername", password: "password123", verified: false})
                try {
                    expect.assertions(1)
                    await db.isValidAccount(unverifiedUser.username, unverifiedUser.password)
                }
                catch(e) {
                    expect(e).toBe("You must verify this account by checking your email!")
                }
            })
            
            test("When a verified account already exists with the exact same username, should result in an error", async () => {
                try {
                    expect.assertions(1)
                    await db.isValidAccount(verifiedUser.username, "validPassword123")
                }
                catch(e) {
                    expect(e).toBe("A verified account already exists with this username!")
                }
            })
    
            test("When a non-school email is used to sign-up, should result in an error", async () => {
                try {
                    expect.assertions(1)
                    await db.isValidEmail("uniqueEmail@ucla.com")
                }
                catch(e) {
                    expect(e).toBe("Not an .edu email address!")
                }
            })
    
            test("When signing up using an email that already exists, should result in an error", async () => {
                try {
                    expect.assertions(1)
                    await db.isValidEmail(verifiedUser.email)
                }
                catch(e) {
                    expect(e).toBe("An account already exists with this email!")
                }
            })

            test("When signing up using an improperly formatted email, should result in an error", async () => {
                try {
                    expect.assertions(1)
                    await db.isValidEmail("notAValidEmail@", "validPassword123")
                }
                catch(e) {
                    expect(e).toBe("Not a valid email address!")
                }
            })
    
            test("When signing up using a password that is less than eight characters long, should result in an error", async () => {
                try {
                    expect.assertions(1)
                    await db.isValidAccount("uniqueUsername", "1234567")
                }
                catch(e) {
                    expect(e).toBe("Password must be at least 8 characters long!")
                }
            })
    
            test("isValidAccount should resolve to true if sign-up information meets all requirements.", async () => {
                try {
                    const result = await db.isValidAccount("uniqueUsername", "12345678")
                    expect(result).toBe(true) 
                }
                catch(e) {
                    console.log(e)
                }
            })
        })
    }) 

    describe("Testing the retrieval of a user's average rating", () => {
        const testRevieweeUsername = "test_username"
        const test_reviewee = new User({username: testRevieweeUsername, rating: {sumOfAllRatings: 5, totalRatings: 2}})
        
        beforeEach(async () => {
            await new User(test_reviewee).save() 
        })
        afterEach(async () => {
            await User.deleteMany({})
        })
    
        describe("Test the retrieval of a user's average rating", () => {
            test("Correctly calculates the average rating of a user with 3 reviews.", async () => {
                const {sumOfAllRatings, totalRatings} = test_reviewee.rating 
                const expectedRating = (sumOfAllRatings / totalRatings).toFixed(2)
                return db.getAverageRating(testRevieweeUsername).then((rating) => {
                    expect(rating).toBe(expectedRating);
                })
            })

            test("When requesting the average rating of a user that is in the database, should return 200 response code", async () => {
                await request(app)
                    .get("/users/get-rating")
                    .query({username: testRevieweeUsername})
                    .expect(200)
            })
        
            test("When requesting the average rating of a user that has no reviews, should return 404 response code", async () => {
                await request(app)
                    .get("/users/get-rating")
                    .query({username: 'does_not_exist'})
                    .expect(404)
            })
        })
    })

    describe("Testing the retrieval of user account information", () => {
        test("When parsing an edu email, should return the school if it is in the database", async () => {
            const ucla1 = await db.parseSchoolFromEmail('bruin@g.ucla.edu')
            const ucla2 = await db.parseSchoolFromEmail('bruin@ucla.edu')
            const ucsb = await db.parseSchoolFromEmail('gaucho@ucsb.edu')
            expect(ucla1).toBe('UCLA')
            expect(ucla2).toBe('UCLA')
            expect(ucsb).toBe('UCSB')
        })

        test("When parsing an edu email not found in the database, should return null", async () => {
            const invalidSchool = await db.parseSchoolFromEmail('someStudent@fakeschool.edu')
            expect(invalidSchool).toEqual(null)
        })

        test("When parsing an invalid email domain, should return an error", async () => {
            try {
                expect.assertions(1)
                const invalidDomain = await db.parseSchoolFromEmail('someStudent@')
            }
            catch(e) {
                expect(e).toEqual("Could not parse email to identify school")
            }
        })

        test("When requesting account information using a valid username, response should return an object with properties: username, firstName, lastName, email, createdAt, and picUrl", done => {
            db.getMyInfo(verifiedUser.username, (err, result) => {
                expect(err).toEqual(null) 
                const {username, firstName, lastName, email, picUrl} = verifiedUser 
                expect(result).toEqual(expect.objectContaining({
                    username, firstName, lastName, email, picUrl
                }))
                done() 
            })
        })
        test("When requesting account information using an invalid username, the response should be an error", done => {
            db.getMyInfo('invalidUsername', (err, result) => {
                expect(err).toEqual({message: "ERROR: username not found"}) 
                expect(result).toEqual(null) 
                done() 
            })
        })

        test("When updating a user's name or phone number, should set the corresponding user's name and phone number fields", done => {
            const updates = {
                phoneNumber: '1231231234', firstName: 'John', lastName: 'Smith'
            } 
            db.updateUser(verifiedUser.username, updates, (err, result) => {
                expect(result).toEqual(expect.objectContaining({
                    phoneNumber: updates.phoneNumber,
                    firstName: updates.firstName, 
                    lastName: updates.lastName
                }))
                done() 
            }) 
        })

        test("When sending an GET request to /users/my-info in an authorized session, should expect 200 response.", async () => {
            await request(app)
                .get('/users/my-info')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .expect(200) 
        })
    })

    describe("Testing uploading/retrieval of a user's profile picture", () => {
        test("When updating a user's profile pic, should set user's picUrl and picType", done => {
            db.uploadPicUrl('verifiedUser', 'somePicUrl', 'somePicType', (err, result) => {
                expect(result).toEqual(expect.objectContaining({
                    picUrl: 'somePicUrl', 
                    picType: 'somePicType' 
                }))
                done() 
            })
        })
    
        test("When retrieving a user's profile pic url using an invalid username, the response should be an error", done => {
            db.getPicUrl('invalidUsername', (err, result) => {
                expect(err).toEqual({message: "ERROR: no result; potentially wrong username"})
                done() 
            })
        }) 
    
        test("When retrieving a user's profile pic url that has not been set, the response should be an error", done => {
            db.getPicUrl(verifiedUser.username, (err, result) => {
                expect(err).toEqual({message: "ERROR: user's profile picture undefined"})
                done() 
            })
        }) 

        test("When retrieving a user's profile pic url using a valid username, should receive it.", done => {
            const {firstName, lastName, password, email, verified} = verifiedUser 
            const verifiedUserWithProfilePic = new User({
                firstName, lastName, username: 'verifiedUserWithPicUrl', password, email, verified, picUrl: 'testUrl'
            }) 
            verifiedUserWithProfilePic.save((err) => {
                db.getPicUrl(verifiedUserWithProfilePic.username, (err, result) => {
                    expect(result).toEqual('testUrl')
                    done() 
                })
            })
        })

        test("When sending a PATCH request to /users/upload-profile-pic with a valid PNG image, should expect 200 response.", async () => {
            await request(app)
                .patch('/users/upload-profile-pic')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .attach('file', './tests/user/test_profile.png')
                .expect(200) 
        })

        test("When sending a PATCH request to /users/upload-profile-pic with a non-image file, should expect 400 error response.", async () => {
            await request(app)
                .patch('/users/upload-profile-pic')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .attach('file', './tests/user/user.test.js') // improper image file 
                .expect(400) 
                .then((res) => {
                    expect(res.body.message).toEqual("ERROR: file type must be of: jpg, jpeg, heic, or png")
                })
        })

        test("When sending a GET request to /users/usersPic, should receive a 200 response with a url to the user's profile pic.", async () => {
            await User.deleteMany()
            verifiedUser.picUrl = 'https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png'
            await new User(verifiedUser).save() 
            await request(app)
                .get('/users/usersPic')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .query({username: verifiedUser.username})
                .expect(200) 
        })
    })

    describe("Testing validation of user properties, such as username or email", () => {
        test("When sending an GET request to /users/usernameValidation with a valid username associated with an account, should expect 200 response.", async () => {
            await request(app)
                .get('/users/usernameValidation')
                .query({username: verifiedUser.username})
                .expect(200) 
        })

        test("When sending an GET request to /users/emailValidation with a valid email associated with an account, should expect 200 response.", async () => {
            await request(app)
                .get('/users/emailValidation')
                .query({email: verifiedUser.email})
                .expect(200) 
        })

        test("When sending an GET request to /users/phoneNumberValidation with a valid phone number associated with an account, should expect 200 response.", async () => {
            await request(app)
                .get('/users/phoneNumberValidation')
                .query({phoneNumber: verifiedUser.phoneNumber})
                .expect(200) 
        })

        test("When successfully confirming password credentials using a valid password during a user session, should return 200 response code", async () => {
            await request(app)
                .post('/users/checkCredentials')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    password: "password"
                })
                .expect(200) 
        })

        test("When confirming password credentials using a valid password during a user session, should return 200 response code", async () => {
            await request(app)
                .post('/users/checkCredentials')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    password: "password"
                })
                .expect(200) 
        })

        test("When confirming password credentials using an invalid password during a user session, should return 401 response code", async () => {
            await request(app)
                .post('/users/checkCredentials')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    password: "incorrectPassword"
                })
                .expect(401) 
        })
    })

    describe("Testing update and deletion related operations", () => {
        test("When updating a user's about me, should properly update the aboutMe field", async () => {
            const updatedAboutMe = "This is a new about me description!" 
            const userWithUpdatedAboutMe = await db.updateAboutMe(verifiedUser.username, updatedAboutMe) 
            expect(userWithUpdatedAboutMe.aboutMe).toBe(updatedAboutMe) 
        }) 

        test("When updating the about me of a user who does not exist, should return an error message", async () => {
            try {
                await db.updateAboutMe('nonexistent_user', 'Test about me description')
            }
            catch(e) {
                expect(e).toBe('Could not find user in database when updating about me.')
            }
        })
    
        test("When deleting a user, should delete all instances of that user in User, Ride, and Noti", done => {
            const {username} = verifiedUser 
            Ride.create({ownerUsername: username}).then(
                Noti.create({username}).then(
                    db.deleteUser(username, (err, result) => {
                        Ride.findOne({ownerUsername: username}, (err, result) => {
                            expect(result).toEqual(null) 
                            Noti.findOne({username}, (err, result) => {
                                expect(result).toEqual(null)
                                User.findOne({username}, (err, result) => {
                                    expect(result).toEqual(null) 
                                    done()
                                })
                            })
                        }) 
                    }) 
                )
            )
        })
    
        test("When reseting a user's password, should update the user's password field to the new password.", done => {
            const newPassword = sha256('newPassword') 
            db.passwordReset(verifiedUser.username, newPassword, (err, result) => {
                expect(result).toEqual(expect.objectContaining({
                    password: newPassword
                }))
                done() 
            })
        }) 

        test("When changing a user's password in an authorized session, should return 200 response code", async () => {
            await request(app)
                .patch('/users/changePassword')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    newPassword: "newPassword" 
                })
                .expect(200) 
        })

        test("When changing a user's password in an unauthorized session, should return 200 response code", async () => {
            await request(app)
                .patch('/users/changePassword')
                .set('Authorization', 'Bearer WRONG_AUTHORIZATION_TOKEN')
                .send({
                    newPassword: "newPassword" 
                })
                .expect(401) 
        })

        test("When sending a PATCH request to /users/updateUser with a new name, should receive a 200 response with the newly updated information", async () => {
            await request(app)
                .patch('/users/updateUser')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    firstName: 'Evan', 
                    lastName: 'Lin'
                })
                .expect(200) 
                .then((res) => {
                    expect(res.body).toEqual(expect.objectContaining({firstName: 'Evan', lastName: 'Lin', phoneNumber: verifiedUser.phoneNumber}))
                })
        })

        test("When sending a PATCH request to /users/updateUser with a new name, should receive a 200 response with the newly updated information", async () => {
            await request(app)
                .patch('/users/updateUser')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    firstName: 'Evan', 
                    lastName: 'Lin'
                })
                .expect(200) 
                .then((res) => {
                    expect(res.body).toEqual(expect.objectContaining({firstName: 'Evan', lastName: 'Lin', phoneNumber: verifiedUser.phoneNumber}))
                })
        })

        test("When sending a PATCH request to /users/updateUser with a new phone number, should receive a 200 response with the newly updated information", async () => {
            await request(app)
                .patch('/users/updateUser')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    phoneNumber: '1111111111'
                })
                .expect(200) 
                .then((res) => {
                    expect(res.body).toEqual(expect.objectContaining({firstName: verifiedUser.firstName, lastName: verifiedUser.lastName, phoneNumber: '1111111111'}))
                })
        })

        test("When deleting a user while logged in with valid credentials, should return 200 response code, ", async () => {
            await request(app)
                .delete('/users/deleteUser')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .expect(200) 
        })
    })

})







