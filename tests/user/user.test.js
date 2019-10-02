require("../../src/db/mongoose");

const User = require("../../src/user/user").User 
const Ride = require("../../src/ride/ride").Ride 
const Noti = require("../../src/noti/noti").Noti 

const app = require('../../src/app')
const request = require('supertest') 
const db = require("../../src/user/controller.js");
const sha256 = require("sha256");
const jwt = require("jsonwebtoken");


describe("Testing users without existing accounts", () => {
    test("When signing up a new user, a new user should be added to the database with a name, username, password, email, and an unverified status.", (done) => {
        db.signup({
            name: "John Smith", 
            username: "jsmith", 
            password: sha256("password")
        }, "jsmith@g.ucla.edu", (err, result) => {
            expect(result).toEqual(expect.objectContaining({
                name: "John Smith", 
                username: "jsmith", 
                password: sha256("password"), 
                email: "jsmith@g.ucla.edu", 
                verified: false
            })) 
            done()
        }) 
    })

    test("When sending an POST request with an unused username to /users/signup to create a new account, should expect 201 Created response.", async () => {
        await request(app)
            .post('/users/signup')
            .send({
                username: 'testUser', 
                password: 'password', 
                name: "First Last"
            })
            .expect(201) 
    })
}) 

describe('Testing users with unverified accounts', () => {
    const unverifiedUser = new User({
        name: "First Last", 
        username: "unverifiedUser", 
        password: sha256("password"), 
        email: "unverifiedUser@g.ucla.edu"
    }) 

    beforeEach(() => {
        return new User(unverifiedUser).save() 
    })
    afterEach(() => {
        return User.deleteMany() 
    })

    test("When logging in on an account that has not been verified, should return an unverified email error.", done => {
        db.login('unverifiedUser@g.ucla.edu', sha256('password'), (err, result) => {
            expect(result).toEqual(null)
            expect(err).toEqual({ message: "email not verified" }) 
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

        test("When sending an POST request to /users/signup with a username that is associated with an existing account that is NOT verified yet, should expect 409 Conflict response.", async () => {
            await request(app)
                .post('/users/signup')
                .send({
                    username: unverifiedUser.username, 
                    password: 'password', 
                    name: "First Last"
                })
                .expect(409) 
        })
    }) 
})

describe('Testing users with verified accounts', () => {
    const verifiedUser = new User({
        name: "First Last", 
        username: "verifiedUser", 
        password: sha256("password"), 
        email: "verifiedUser@g.ucla.edu", 
        phoneNumber: '1231231234', 
        verified: true 
    })
    const verifiedUserEmailAuthToken = jwt.sign({ email: verifiedUser.email }, process.env.JWT_EMAIL_KEY, { expiresIn: "24h"});
    const verifiedUserUsernameAuthToken = jwt.sign({ username: verifiedUser.username }, process.env.JWT_SECRET_KEY);

    beforeEach(() => {
        return new User(verifiedUser).save() 
    })

    afterEach(() => {
        return User.deleteMany() 
    })

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
            const {name, username, email, verified} = verifiedUser 
            expect(result).toEqual(expect.objectContaining({
                name, username, password: sha256("password"), email, verified
            })) 
            done()
        }) 
    }) 

    test("When requesting account information using a valid username, response should return an object with properties: username, name, email, createdAt, and picUrl", done => {
        db.getMyInfo(verifiedUser.username, (err, result) => {
            expect(err).toEqual(null) 
            const {username, name, email, picUrl, createdAt} = verifiedUser 
            expect(result).toEqual(expect.objectContaining({
                username, name, email, picUrl, createdAt
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
        const {name, password, email, verified} = verifiedUser 
        const verifiedUserWithProfilePic = new User({
            name, username: 'verifiedUserWithPicUrl', password, email, verified, picUrl: 'testUrl'
        }) 
        verifiedUserWithProfilePic.save((err) => {
            db.getPicUrl(verifiedUserWithProfilePic.username, (err, result) => {
                expect(result).toEqual('testUrl')
                done() 
            })
        })
    }) 

    test("When updating a user's name or phone number, should set the corresponding user's name and phone number fields", done => {
        const updates = {
            phoneNumber: '1231231234', name: 'New Name'
        } 
        db.updateUser(verifiedUser.username, updates, (err, result) => {
            expect(result).toEqual(expect.objectContaining({
                phoneNumber: updates.phoneNumber,
                name: updates.name 
            }))
            done() 
        }) 
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

    describe("Testing endpoints", () => {
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

        test("When sending an POST request to /users/signup with a username that has been taken to create a new account, should expect 409 Conflict response.", async () => {
            await request(app)
                .post('/users/signup')
                .send({
                    username: verifiedUser.username, 
                    password: 'password', 
                    name: "First Last"
                })
                .expect(409) 
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

        test("When sending an GET request to /users/usernameValidation with a valid username associated with an account, should expect 200 response.", async () => {
            await request(app)
                .get('/users/usernameValidation')
                .query({username: verifiedUser.username})
                .expect(200) 
        })

        test("When sending an GET request to /users/usernameValidation with a username that is not associated with an account, should expect 404 response.", async () => {
            await request(app)
                .get('/users/usernameValidation')
                .query({username: 'invalidUsername'})
                .expect(404) 
        })

        test("When sending an GET request to /users/emailValidation with a valid email associated with an account, should expect 200 response.", async () => {
            await request(app)
                .get('/users/emailValidation')
                .query({email: verifiedUser.email})
                .expect(200) 
        })

        test("When sending an GET request to /users/emailValidation with an invalid email that is not associated with an account, should expect 404 response.", async () => {
            await request(app)
                .get('/users/emailValidation')
                .query({email: 'invalidEmail@g.ucla.edu'})
                .expect(404) 
        })

        test("When sending an GET request to /users/phoneNumberValidation with a valid phone number associated with an account, should expect 200 response.", async () => {
            await request(app)
                .get('/users/phoneNumberValidation')
                .query({phoneNumber: verifiedUser.phoneNumber})
                .expect(200) 
        })

        test("When sending an GET request to /users/phoneNumberValidation with an invalid phone number that is not associated with an account, should expect 404 response.", async () => {
            await request(app)
                .get('/users/phoneNumberValidation')
                .query({phoneNumber: 'wrongPhoneNumber'})
                .expect(404) 
        })

        test("When sending an GET request to /users/my-info in an authorized session, should expect 200 response.", async () => {
            await request(app)
                .get('/users/my-info')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .expect(200) 
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

        test("When sending a PATCH request to /users/updateUser with a new name, should receive a 200 response with the newly updated information", async () => {
            await request(app)
                .patch('/users/updateUser')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    name: 'Evan'
                })
                .expect(200) 
                .then((res) => {
                    expect(res.body).toEqual(expect.objectContaining({name: 'Evan', phoneNumber: verifiedUser.phoneNumber}))
                })
        })

        test("When sending a PATCH request to /users/updateUser with a new name, should receive a 200 response with the newly updated information", async () => {
            await request(app)
                .patch('/users/updateUser')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    name: 'Evan'
                })
                .expect(200) 
                .then((res) => {
                    expect(res.body).toEqual(expect.objectContaining({name: 'Evan', phoneNumber: verifiedUser.phoneNumber}))
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
                    expect(res.body).toEqual(expect.objectContaining({name: verifiedUser.name, phoneNumber: '1111111111'}))
                })
        })

        test("When deleting a user while logged in with valid credentials, should return 200 response code, ", async () => {
            await request(app)
                .delete('/users/deleteUser')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .expect(200) 
        })

        test("When successfully confirming password credentials using a valid password during a user session, should return 200 response code", async () => {
            await request(app)
                .get('/users/checkCredentials')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    password: "password"
                })
                .expect(200) 
        })

        test("When confirming password credentials using a valid password during a user session, should return 200 response code", async () => {
            await request(app)
                .get('/users/checkCredentials')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    password: "password"
                })
                .expect(200) 
        })

        test("When confirming password credentials using an invalid password during a user session, should return 401 response code", async () => {
            await request(app)
                .get('/users/checkCredentials')
                .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
                .send({
                    password: "incorrectPassword"
                })
                .expect(401) 
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
    }) 
})

describe("Testing rating system", () => {
    const testUserOneAuthToken = jwt.sign({ username: "jsmith" }, process.env.JWT_SECRET_KEY)
    const testUserOne = new User({
        name: "John Smith", 
        username: "jsmith",
        rating: {
            totalValue: 15, 
            totalCount: 3, 
            averageRating: 5
        }, 
        verified: true, 
    })


    beforeEach(() => {
        return new User(testUserOne).save() 
    }) 

    afterEach(() => {
        return User.deleteMany() 
    })

    test('When adding a rating that is less than 1, should produce an error response.', async () => {
        expect.assertions(1)
        try {
            await db.addNewRating(testUserOne.username, 0)
        } 
        catch(e) {
            expect(e).toMatch("The rating must be a value from 1 to 5.")
        }
    })

    test('When adding a rating that is greater than 5, should produce an error response', async () => {
        expect.assertions(1)
        try {
            await db.addNewRating(testUserOne.username, 6)
        }
        catch(e) {
            expect(e).toBe("The rating must be a value from 1 to 5.")
        }
    })

    test("When adding a valid rating, the user's rating property should have its fields totalValue and totalCount updated.", async () => {
        const newRating = await db.addNewRating(testUserOne.username, 3)
        expect(newRating.toObject()).toEqual({
            totalValue: 18, 
            totalCount: 4
        })
    })

    test("When retrieving a user's rating, should correctly calculate their average rating.", async () => {
        const averageRating =  await db.getAverageRating(testUserOne.username) 
        expect(averageRating).toEqual({
            averageRating: "5.00"
        })
    })

    test("When retrieving the average rating of a user without at least 3 ratings, should result in an error message.", async () => {
        const user = await User.create({
            username: "John Smith"
        })
        expect.assertions(1)
        try {
            await db.getAverageRating(user.username) 
        }
        catch(e) {
            expect(e).toBe("User must have at least 3 ratings to display an average rating!")
        }
    })

    describe("Testing endpoints", () => {
        test('When sending a valid request to the /users/rating endpoint, should expect a 200 response.', async (done) => {
            await request(app)
                .get(`/users/rating`)
                .query({username: testUserOne.username})
                .set('Authorization', 'Bearer ' + testUserOneAuthToken)
                .send({})
                .expect(200)
            done() 
        })
    
        test('When sending a valid PATCH request to /users/rating, should expect a 200 response back.' , async (done) => {
            await request(app)
                .patch(`/users/rating`)
                .query({username: testUserOne.username})
                .set('Authorization', 'Bearer ' + testUserOneAuthToken)
                .send({
                    rating: 5.00
                })
                .expect(200)
            done() 
        })


    }) 
})




