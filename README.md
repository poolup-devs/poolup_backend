# PoolUp Backend

### api.poolup.co

This is the backend code repository for PoolUp: made with NodeJS, Express, and MongoDB w/ Mongoose.
For additional guidence/help, email bin315a1@g.ucla.edu or your current Engineering Manager.

1. [Setup](#setup)
2. [Dev-Rules](#dev-rules)
3. [Documentation](#documentation)
4. [Deployment](#deployment)

# Setup

1. [Local Environment Setup](#local-environment-setup)
2. [Local Development Setup](#local-development-setup)
3. [Npm Scripts](#npm-scripts)
4. [Additional Tools](#additional-tools)
5. [Directory Structure](#directory-structure)

---

## Local Environment Setup

1. Install nodeJS by following installation guides from https://nodejs.org/en/download/
2. Clone the repository to your local environment using `git clone https://github.com/poolup-devs/poolup_backend.git`
3. Install all used packages and dependencies using:
   > npm install
4. To connect to the development s3 bucket, run:

   > npm run setup

   This creates the files dev.env and test.env and places it in a directory named config in the root directory. There, enter the bucket name, access key, the secret access key, and the MongoDB database URL assigned from the engineering manager and save.

   !!!Make sure NOT to remove .env in .gitignore; publishing access keys publically causes bigger problems!!!

5. Install mongoDB by following installation guides from:
   Mac: https://treehouse.github.io/installation-guides/mac/mongo-mac.html
   Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/

   This is different from the npm package listed in package.json: which is the driver that connects the DB to the nodeJS app.
   For choosing the inital db location, just use the default --dbpath=/data/db to prevent future confusion

6. Optional: Initialize the database with default objects.

   > npm run init_db

   This REMOVES existing database collections and populates them with default objects.

---

## Local Development Setup

1. Open a terminal, and run the command `mongod` to start the mongodb daemon - may have to run `sudo mongod` for permission purposes
2. Open another terminal and run `npm run dev` in the home directory; this starts the backend application with nodemon
3. The local backend development port is set to 3000, now use Postman to test API endpoints. Look at [Using Postman](#using-postman) for instructions.

---

## NPM Scripts

1. Starting the NodeJS app

   > npm start

   Starts up the server by running `node src/server.js` with environment variables defined in dev.env.

2. Start Dev. mode of the NodeJS app

   > npm run dev

   Similar to npm start, but runs nodemon to automatically restart the node application when file chnages in the directory are detected

3. Setup .env variables

   > npm run setup

   Generates the config folder with env files. This is explained in [the next step](#local-environment-setup)

   Do NOT run this script twice; the second run will overwrite the env files, erasing the entered credentials

4. Run Test Scripts

   > npm run test

   We are using [Jest](https://www.npmjs.com/package/jest) to test our JS code.
   Run tests related to changed files based on Git (uncommitted files).
   Uses the test.dev environment variables.

5. Initialize database with default creations

   > npm run init_db

   Removes all documents in all the collections, and initializes the database with default objects.
   Currently only removes and creates from User collection.

---

## Additional Tools

1. Download and install Postman to test backend REST APIs
2. Install Robo 3T for mongoDB GUI and create a new connection to the DB using port 27017, the default mongoDB port

---

## Directory Structure

```
.
|   .gitignore
|   .sample_env
|   init_db.js
|   LICENSE
|   package-lock.json
|   package.json
|   README.md
|   setup.js
|   docker-compose.yml
|
+---config
|       .env-cmdrc
+---dockerfiles
|       main
|       mongo_seed
|
+---src
|   |   app.js
|   |   server.js
|   |
|   +---db
|   |       awsS3_controller.js
|   |       mongoose.js
|   |
|   +---middleware
|   |       cors_origin_control.js
|   |       jwt_authenticator.js
|   |
|   +---noti
|   |       controller.js
|   |       index.js
|   |       noti.js
|   +---request
|   |       controller.js
|   |       index.js
|   |       noti.js
|   |
|   +---ride
|   |       controller.js
|   |       index.js
|   |       ride.js
|   |
|   +---stripe
|   |   |    index.js
|   |   +----tool
|   |           driver-info-validation.js
|   |
|   +---user
|   |       controller.js
|   |       index.js
|   |       user.js
|   |
|   \---utils
|           token-parser.js
|
\---tests
    \---user
            rating.test.js
```

---

# Dev-Rules

## Creating a new branch

**Naming Branches**

<nameOfCreator>-<feature/issuename>-<creationdate(mmddyyyy)>

ex) han-messagingFeature-12302019

## Posting Git Issues

**Formatting**

Copy and use the following format:

\*\*CURRENT ISSUE\*\*

Describe the reasoning of the new feature or the change in the current feature

\*\*TODO\*\*

Descriptively list out required tasks

\*\*POTENTIAL CONFLICTS/ ALTERNATIVES\*\*

Explain potential conflicts that may arise with the current code base, issues that should be discussed with the initial creator, and alternative solutions (if there exists)

\*\*ADDITIONAL COMMENT\*\*

Additional Comment

## Using POSTMAN

We use a single account that is shared by everyone (b/c we're broke). Ask for PoolUp's dev gmail credential, login, and use the collection located in it.

**Creating a Postman Request**

All the requests under the workspace collection inherits a authToken variable automatically via a pre-request script;

When creating each requests:

- If authToken is required, go to the Authorization tab of the request, and select "inherit auth from parent" under the TYPE tab; no further authToken has to be passed through Headers
- The pre-request scripts are set to use "user1" (defined in init_db.js):
- Since it's a shared account, be wise when overwriting/saving a request

```
{
    "username":"admin",
    "email":"admin-noreply@g.ucla.edu",
    "password":"password"
}
```

- If you want to login as another user, use the login API to retrieve the authToken, set Authorization to "No Auth", and pass the authToken in the header file instead and follow the Auth Tokens syntax explained under Documentation below. **DO NOT** save the configuration into the Postman collection, as the default config should remain using the parent-inherited-variables

---

# Documentation

## Auth Tokens

For all API requests after login, the bearer token must be included in headers for authorization/ username extraction.

| Key           | Value               |
| ------------- | ------------------- |
| Authorization | Bearer [Auth token] |

There must be a white space between the string "Bearer" and the token string


## Scheduling Tasks
All scheduled tasks should be in /tasks/scheduledTasks.js, with unit tests in /tests/tasks/scheduledTasks.test.js
Operations
-  `void scheduleTaskHoursAfterDate(uniqueTaskName, task, date, hours)`
	- Schedules a task to *run once*, X hours after a certain date
		-  **uniqueTaskName**: uniquely identify the task in the case you ever need to cancel the task
		-  **task**: function pointer of the task to schedule
		-  **date**: JavaScript Date object
		-  **hours**: number of hours after specified date
-  `cancelTasksAssociatedWithRide(rideId)`
	- Clean up all tasks associated with a ride
	- This will clean up tasks named with the following format: **taskFunctionName:{rideId}**
		- ex: **updateCompletedRidesTask:{rideId}** or **promptLeaveAReviewTask:{rideId}**
	- This can be used to clean up scheduled email reminders and web notifications for rides that have been cancellled 
-  `bool cancelTask(taskName)`
	- Cancel a task, returns a Promise that resolves into a boolean value 

## Models & API Endpoints Documentation

Models:

1. [User](#user-model)
2. [Ride](#ride-model)
3. [Noti](#noti-model)
4. [Review](#review-model)
5. [Request](#request-model)
6. [Stripe](#stripe-model)

---

### User Model

### Schema

| column         | type    | required | properties                                                   |
| -------------- | ------- | -------- | ------------------------------------------------------------ |
| firstName      | String  | Yes      |                                                              |
| lastName       | String  | Yes      |                                                              |
| email          | String  | Yes      |                                                              |
| username       | String  | Yes      |                                                              |
| password       | String  | Yes      |                                                              |
| phoneNumber    | String  |          |                                                              |
| picUrl         | String  |          |                                                              |
| picType        | String  |          |                                                              |
| isRegistered   | Boolean | Yes      |                                                              |
| createdAt      | Date    |          |                                                              |
| aboutMe        | String  |          |                                                              |
| school         | String  |          |                                                              |
| ridesCancelled | Number  |          |                                                              |
| ridesCompleted | Number  |          |                                                              |
| rating         | Object  |          | sumOfAllRatings, totalRatings                                |
| stripe         | Object  |          | accountID, customerID                                        |
| driver         | Object  |          | licensePlate, vehicleMakeModel, driversLicense, vehicleColor |

### API Endpoints

| url                          | HTTP Method | description                                                        |
| ---------------------------- | ----------- | ------------------------------------------------------------------ |
| /users/login                 | POST        | [User Login](#user-login)                                          |
| /users/signup                | POST        | [User Signup](#user-signup)                                        |
| /users/sendVerificationEmail | GET         | [Send a verification email to signup](#send-verification-email)    |
| /users/verify                | GET         | [Verify an email](#email-verification)                             |
| /users/usernameValidation    | GET         | [Validation/usability of a username](#username-validation)         |
| /users/phoneNumberValidation | GET         | [Validation/usability of a phone number](#phone-number-validation) |
| /users/upload-profile-pic    | PATCH       | [upload a user profile image](#upload-profile-image)               |
| /users/usersPic              | GET         | [Get a user's profile image](#get-profile-image)                   |
| /users/updateUser            | PATCH       | [Update a user's name or phonenumber](#update-user)                |
| /users/deleteUser            | DELETE      | [Delete a user account](#delete-user)                              |
| /users/checkCredential       | POST        | [Check a user's password before changing it](#check-credential)    |
| /users/changePassword        | PATCH       | [Change a user's password](#change-password)                       |
| /users/my-info               | GET         | [Get my account's information](#my-info)                           |
| /users/get-rating            | GET         | [Get a user's rating](#get-rating)                                 |
| /users/get-school            | GET         | [Get a user's school](#get-school)                                 |
| /users/get-about-me          | PATCH       | [Get about me](#get-about-me)                                   |
| /users/updateAboutMe         | PATCH       | [Update about me](#update-about-me)                                |
| /users/get-public-profile    | GET         | [Get user's public profile info](#get-public-profile-info)         |
| /users/driverStatus          | GET         | [Check if a user is a driver](#check-if-driver)                    |

---

### User Login

##### Initial Login:

POST request

DOES NOT require a Bearer token; after this signup, the authToken contains information of the user & lifetime of the token

**body**

```
{
	"email": "bin315a1@gmail.com",
	"password":"bin315a1"
}
```

**return value**

200 status,

```
{
    "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImJpbjMxNWExIiwiaWF0IjoxNTY1ODk2NzQzLCJleHAiOjE1NjU5MDAzNDN9.OLcXkfZWrTDo4r_VXK9sjOh7pa5--E1wRs7r0X-mK0I"
}
```

### User Signup

POST request

- Permanently registers an account in the database and returns an authentication token. 
- Must provide an email, first name, last name, and password of at least 8 digits. 
- The `username` property is updated by parsing the email. 
- The `school` property is updated by parsing the email. If the school cannot be identified during sign-up, the field is set to **null**, and the account will still be created. 
    - To perform email parsing, a Schools collection is assumed to exist in the database that contains the two properties: emailDomain and school 
    - The associations are stored in a JSON file in /setup/schoolEmails.json and imported periodically to the database via the init_db command. 
        - Example of JSON entry: {"emailDomain": "ucla", "school": "UCLA"} 
        - This entry identifies the school 'UCLA' for the emails: "example@g.ucla.edu" and "example@ucla.edu"
- A default profile pic of Bruinbear with random color is assigned

**Body**

```
{
	"email": "elin0467@g.ucla.edu",
    "firstName": "Evan", 
    "lastName": "Lin", 
	"password": "password"
}
```

**return value**
{
    "registeredUser": {
        "stripe": {
            "customerID": "",
            "accountID": ""
        },
        "driver": {
            "isDriver": false,
            "licensePlate": "",
            "vehicleMakeModel": "",
            "driversLicense": "",
            "vehicleColor": ""
        },
        "rating": {
            "sumOfAllRatings": 0,
            "totalRatings": 0
        },
        "picType": "png",
        "isRegistered": true,
        "createdAt": "2020-04-12T20:13:40.851Z",
        "ridesCancelled": 0,
        "ridesCompleted": 0,
        "_id": "5e93769a95c105385c0ccd9b",
        "email": "elin0467@g.ucla.edu",
        "__v": 0,
        "firstName": "Evan",
        "lastName": "Lin",
        "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        "school": "UCLA",
        "username": "elin0467"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImVsaW4wNDY3IiwiaWF0IjoxNTg2NzIyNTA0LCJleHAiOjE1ODY4MDg5MDR9.SgNf9XUOUBMuTfRuw4LgOTTRbw04_8rFD7ng87-ax7U"
}

201 Created if the user was successfully registered into the database. 
500 status if there was a database error while registering the user, or if the user skipped the email verification step. 

---

### Send Verification Email 

GET request 

This request first verifies whether the email is valid, returning an error message if not. It uses the following criteria to determine validity: 
1. **Email is not unique** -> "An account already exists with this email!" 
2. **Email is not properly formatted, according to RFC standards** -> "Not a valid email address!" 
3. **Email is not a student email** -> "Not an .edu email address!"
4. **Email is associated with a registered account** -> "A registered account already exists with this email!"
**
If the email is valid, the endpoint sends a verification email to the user. 
This endpoint can be called multiple times to resend the verification email. 

**params**
email address 

**return value** 
200 response if the email was sent
500 reponse otherwise, with the error message attached 

---

### Email Verification

GET request

A URL containing this endpoint is sent to the user when they receive the verification email. You do not need to manually call this endpoint. 
The database stores the user's email for 30 minutes until the user completes account registration. 

**params**

token

**example**

localhost:3000/users/verify?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImlhbWJyeWFuLmxlZUBnbWFpbC5jb20iLCJpYXQiOjE1NjU1ODIxMDUsImV4cCI6MTU2NTY0MjEwNX0.78CKxrCkfidoby-iYDKKe5_KQR4BKIV4D6LI4koHKEQ

**return value**

200 status, returns a redirection to https://poolup.co/signup/3 to proceed with Account Information registration. 

---

### Username Validation

GET request

**params**

username

**example**

localhost:3000/users/usernameValidation?username=bin315a1

**return value**

200 status, array of user objects with that username

```
[
    {
        "driverList": [],
        "riderList": [],
        "isRegistered": true,
        "_id": "5d55af9f4c5458138f2efa85",
        "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        "username": "bin315a1",
        "name": "Han",
        "email": "bin315a1@g.ucla.edu",
        "__v": 0
    }
]
```

---

### Phone Number Validation

GET request

**params**

phoneNumber

**example**

localhost:3000/users/phoneNumberValidation?phoneNumber=1231231234

**return value**

200 status, array of user objects with that phoneNumber

---

### Upload Profile Image

PATCH request

Upload a profile picture for the currently logged in user. 

**Body**

```
{
    "file": <img file>
}
```

**return value**

200 status

```
{
    "driverList": [],
    "riderList": [],
    "isRegistered": true,
    "_id": "5d55af9f4c5458138f2efa85",
    "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    "username": "bin315a1",
    "name": "Han",
    "email": "bin315a1@g.ucla.edu",
    "__v": 0,
    "picType": "jpg",
    "picUrl": "https://bruinpool-bucket-staging.s3.us-east-2.amazonaws.com/bucketFolder/bin315a1-pic.jpg"
}
```

---

### Get Profile Image

GET request

**params**

username (not id)

**example**

localhost:3000/users/usersPic?username=sampleUser1

**return value**

200 status

```
https://bruinpool-bucket-staging.s3.us-east-2.amazonaws.com/bucketFolder/bin315a1-pic.jpg
```

---

### Update User

PATCH request

**body**

```
{
    "name" : "NEWNAME",
    "phoneNumber" : "1234567891"
}
```

**return value**

200 status

---

### Delete User

DELETE request

Deletes the user account object, all drives (not rides) that the user posted, and all noti object of user

**params/body**

none required

**return value**

200 status

---

### Check Credential

POST request

**body**

password

```
{
	"password" : "password"
}
```

**return value**

200 status if successful ; 401 if password's incorrect

no further return data

---

### Change Password

PATCH request

**body**

newPassword

```
{
	"newPassword" : "password"
}
```

**return value**

200 status if successful

no further return data

---

### My Info

GET request

**params/body**

none required

**return value**

200 status if successful

```
{
    "username": "bin315a1",
    "name": "Han",
    "email": "bin315a1@g.ucla.edu",
    "createdAt": "2019-08-23T11:27:31.739Z",
    "picUrl": "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png"
}
```

---

### Get rating

GET request

- Get the rating of a user

**params/body**

- username

**example**

- localhost:3000/users/get-rating?username=elin4046

**return value**

- An object containing the property averageRating, which is a floating point that is truncated to two decimal points, eg. 2.50

```
{
    "averageRating": 2.50
}
```

---

### Check if Driver

GET request

- Check if a user is a driver

**params/body**

```
none
```

**example**

- localhost:3000/users/driverStatus

**return value**

- An object containing a boolean
- If true then the user is a driver, else they are not.

```
{
    "isDriver": true
}
```

---

### Get rating

GET request

- Get the rating of a user

**params/body**

- username

**example**

- localhost:3000/users/get-rating?username=elin4046

**return value**

- An object containing the property averageRating, which is a floating point that is truncated to two decimal points, eg. 2.50

```

{
"averageRating": 2.50
}

```

---

### Get school

GET request

- Get the user's school
- The user's school is parsed during sign-up by referencing the Schools collection. For more details, reference the sign-up endpoint.

**params/body**

- username

**example**

- localhost:3000/users/get-rating?username=elin4046

**return value**

- An object containing the field `school`. If the school cannot be determined from the email, the `school` field will be set to null.

```

{
"school": "UCLA"
}

```

---
### Get about me 

GET request

- Return a user's about me description, returns {} if one does not exist 

**query** 
username 

**example**
localhost:3000/users/get-about-me?username=elin4046


**return value** 
200 if successful 
500 to indicate database error 

---

### Update about me

PATCH request

- Update the logged in user's about me description

**body**

- aboutMe

```

{
"aboutMe": "This is my new about me description!"
}

```

**example**

- localhost:3000/users/updateAboutMe

**return value**

- 200 status if successful
- 500 status if a database error occurs while updating: 'Could not find user in database when updating about me.'

Returns the user document containing the updated aboutMe property

---

### Get public profile info

GET request

- Get all of a user's public information
- Returns the following user properties: - `name, school, aboutMe, rating, ridesCompleted, ridesCancelled, picUrl, picType`
- Any properties that are not defined are not included; for example, if a user has not received any reviews yet, the `rating` property cannot be computed and subsequently will not be returned

- Additional Note: - `ridesCompleted` automatically updates 2 hours after a ride containing at least one passenger begins - Drivers will receive a **completed ride** for each passenger dropped off - Passengers will receive a single **completed ride** after a carpooling session

**query**

- username

**example**

- localhost:3000/users/get-public-profile?username=admin

**return value**

- 200 status if successful
- 404 status with an error message if the user could not be found

```

{
    "picUrl": "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
    "picType": "png",
    "name": "First Last",
    "school": "UCLA",
    "rating": "3.33",
    "ridesCompleted": 3,
    "ridesCancelled": 1,
    "aboutMe": "This is my about me!"
}

```

---

### Ride Model

### Schema

| column               | type   | required |
| -------------------- | ------ | -------- |
| ownerEmail           | String | Yes      |
| ownerUsername        | String |          |
| ownerPhoneNumber     | String |          |
| from                 | String | Yes      |
| to                   | String | Yes      |
| date                 | Date   | Yes      |
| price                | String | Yes      |
| seats**(remaining)** | Number | Yes      |
| detail               | String |          |
| passengers           | Array  |          |
| instantBook          | Object |          |

<br>

| instantBook           | type    | required |
| --------------------- | ------- | -------- |
| enabled               | Boolean | yes      |
| specificPickUpDropOff | Boolean |          |
| smokingAllowed        | Boolean |          |
| noPetsAllowed         | Boolean |          |
| singleCarryOn         | Boolean |          |
| singleLuggage         | Boolean |          |

### API Endpoints

| url                         | HTTP Method | description                                                               |
| --------------------------- | ----------- | ------------------------------------------------------------------------- |
| /rides/matching-rides       | GET         | [Get List of Available future Rides](#get-list-of-available-future-rides) |
| /rides/user-rides-history   | GET         | [Get ANOTHER USER's ride history](#get-another-users-ride-history)        |
| /rides/my-rides-history     | GET         | [Get MY ride history](#get-my-ride-history)                               |
| /rides/my-rides-upcoming    | GET         | [Get MY ride upcoming](#get-my-ride-upcoming)                             |
| /rides/drives-history       | GET         | [Get a user's (OTHER'S AND MINE) drive history](#get-drive-history)       |
| /rides/drives-upcoming      | GET         | [Get a user's (OTHER'S AND MINE) upcoming drives](#get-upcoming-drives)   |
| /rides/post-ride            | POST        | [Post a Ride](#post-a-ride)                                               |
| /rides/join-ride            | PUT         | [Join a Ride](#join-a-ride)                                               |
| /rides/cancel-ride          | PUT         | [Cancel a Ride](#cancel-a-ride)                                           |
| /rides/delete-ride          | DELETE      | [Delete a ride](#delete-a-ride)                                           |
| /rides/getAvailableCities   | GET         | [Get available cities](#get-available-cities)                             |
| /rides/getAvailableCounties | GET         | [Get available counties](#get-available-counties)                         |

- Note: all get ride apis (with some exception, which will be noted) require a pageNum query param for pagination; index starts at 0

---

### Get List of Available future Rides

GET request

**params**

filter(JSON object with fields: "from", "to", and "date"), pageNum

if FILTER IS UNDEFINED, returns ALL available drives sorted in date/time

filter Schema:

```

    {
        "from": "CITY",
        "to": "CITY",
        "date_from": "TIMERANGE_START",
        "date_to": "TIMERANGE_END"
    }

```

For both "from" and "to" fields, if the field is undefined it is ignored from the filter;
for example, {"from": "Irvine", "to": undefined, ... } will return all rides with any destination that start off in Irvine.

For "date_from" and "date_to" fields, if either is undefined the filter is set to return all available rides ("from" & "to" fields applied) AFTER THE CURRENT TIME (by new Date()).

**exmaple**:

URL syntax:

```

localhost:3000/rides/matching-rides?filter={"from": "Irvine", "to" : "Los Angeles", "date_from": "2019-09-10T00:00:00.000Z", "date_to":"2019-09-12T00:00:00.000Z"}

```

Get all rides from Irvine to Los Angeles between 8:00 AM to 9:30 AM on 2019-09-13

```

    {
        "from": "Irvine",
        "to": "Los Angeles",
        "date_from": "2019-09-13T08:00:00.000Z",
        "date_to": "2019-09-13T09:30:00.000Z"
    }

```

Get all rides from Irvine to anywhere between 8:00 AM to 9:30 AM on 2019-09-13

```

    {
        "from": "Irvine",
        "date_from": "2019-09-13T08:00:00.000Z",
        "date_to": "2019-09-13T09:30:00.000Z"
    }

```

Get all rides from Irvine to anywhere anytime (after the current timestamp, of course)

```

    {
        "from": "Irvine"
    }

```

localhost:3000/rides/matching-rides?filter=

**return value**

200 status

```

[
    {
        "passengers": [],
        "_id": "5d505ed15482ec4e38597cdb",
        "ownerEmail": "bin315a1@gmail.com",
        "ownerUsername": "bin315a1",
        "ownerPhoneNumber": "1231231234",
        "from": "Irvine",
        "to": "Los Angeles",
        "date": "2019-09-11T00:00:00.000Z",
        "price": "20",
        "seats": 4,
        "detail": "Third test for post",
        "__v": 0
    },
    {
        "passengers": [],
        "_id": "5d505f005482ec4e38597cdc",
        "ownerEmail": "bin315a1@gmail.com",
        "ownerUsername": "bin315a1",
        "ownerPhoneNumber": "1231231234",
        "from": "Irvine",
        "to": "Los Angeles",
        "date": "2019-09-13T00:00:00.000Z",
        "price": "20",
        "seats": 4,
        "detail": "First test for post",
        "__v": 0
    }
]

```

---

### Get ANOTHER USERs ride history

GET request

- DOES NOT take a pageNum param

**params**

username

**example**

localhost:3000/rides/user-rides-history?username=bin315a1

**return value**

200 status with an array of rides that the user with the username had in the past (before current date&time)

---

### Get MY ride history

GET request

**params**

pageNum

**example**

localhost:3000/rides/my-rides-history?pageNum=0

**return value**

200 OK status with an array of rides that the user had in the past (before current date&time)

---

### Get MY ride upcoming

GET request

**params**

pageNum

**example**

localhost:3000/rides/my-rides-history?pageNum=0

**return value**

200 OK status with an array of rides that the user will have in the future (after current date&time)

---

### Get drive history

GET request

**params**

username, pageNum

**example**

localhost:3000/rides/my-rides-history?pageNum=0&username=bin315a1

**return value**

200 OK status with an array of rides that the user was the driver in the past (before current date&time)

---

### Get upcoming drives

GET request

**params**

username, pageNum

**example**

localhost:3000/rides/drives-upcoming?pageNum=0&username=bin315a1

**return value**

200 OK status with an array of rides that the user was the driver will drive in the future (after current date&time)

---

### Post a Ride

POST request

- Creates a new ride document.
- Schedules a task to occur two hours after the start of a ride that updates the driver and passenger's `ridesCompleted` property.
- Schedules a task that occurs 12 hours after the start of the ride to send web notifications to leave reviews.

**body**

a new ride object:

```

{
    "rideInfo": {
        "ownerEmail": "bin315a1@gmail.com",
        "ownerUsername": "bin315a1",
        "from": "Irvine",
        "to": "Los Angeles",
        "date": "2019-07-30",
        "price": "20",
        "seats": 4,
        "detail": "Third test for post",
        "passengers": []
    }
}

```

**return value**

201 status

```

{
    "passengers": [],
    "_id": "5d55b5721e78951430fdcc66",
    "ownerEmail": "bin315a1@g.ucla.edu",
    "ownerUsername": "bin315a1",
    "from": "Irvine",
    "to": "Los Angeles",
    "date": "2019-07-30T00:00:00.000Z",
    "price": "10",
    "seats": 4,
    "detail": "before today's date",
    "_v": 0
}

```

---

### Join a Ride

PUT request

**body**

The ride object that the user is trying to join:

```

{
    "ride" : {
        "passengers": [],
        "_id": "5d505ed15482ec4e38597cdb",
        "ownerEmail": "bin315a1@gmail.com",
        "ownerUsername": "bin315a1",
        "ownerPhoneNumber": "1231231234",
        "from": "Irvine",
        "to": "Los Angeles",
        "date": "2019-09-11T00:00:00.000Z",
        "price": "20",
        "seats": 4,
        "detail": "Third test for post",
        "_v": 0
    }
}

```

**return value**

200 status with the same ride object joined

```

{
    "passengers": [
        "bin315a1"
    ],
    "_id": "5d505ed15482ec4e38597cdb",
    "ownerEmail": "bin315a1@gmail.com",
    "ownerUsername": "bin315a1",
    "ownerPhoneNumber": "1231231234",
    "from": "Irvine",
    "to": "Los Angeles",
    "date": "2019-09-11T00:00:00.000Z",
    "price": "20",
    "seats": 3,
    "detail": "Third test for post",
    "__v": 0
}

```

---

### Cancel a Ride

PUT request

- Whether the logged in user is a driver or a passenger in the ride is abstracted away.

- In the event that a **driver** cancels a ride **without any passengers** in it, the following occurs:
	1. The ride is removed from the Ride collection.
	2. The driver does not incur any penalties, such as +1 to their number of cancelled rides on their profile.

  
- In the event that a **driver** cancels a ride **with at least one passenger** in it, the following occurs:
	1. All passengers receive a notification that their ride has been cancelled. This notification will include an additional property: `cancellationReason`.
		- An example of a notification received by a passenger in the ride is the following:
			```
			{
				viewed: false,
				_id: 5e6532be23cf21496470c042,
				username: 'passenger1',
				msg: 'driverUsername has cancelled your ride',
				senderEmail: 'driverUsername@ucla.edu',
				date: 2020-03-08T18:00:30.136Z,
				__v: 0,
				additionalProperties: {
					cancellationReason: 'No longer traveling'
				}
			}
			```
	2. The ride is removed from the Ride collection.
	3. The driver receives the following penalty:
		-  `ridesCancelled` property is incremented

- In the event that a **passenger** cancels a ride, the following occurs:
	1. The driver is notified about the cancellation. This notification will include the additional properties: `cancellationReason` and `messageToDriver`.
		- An example of a notification received by the driver is the following:
			```
			{
				viewed: false,
				_id: 5e6534144a54ab39342752d0,
				username: 'driverUsername',
				msg: 'passenger1 has cancelled your ride',
				senderEmail: 'passenger1@ucla.edu',
				date: 2020-03-08T18:06:12.834Z,
				__v: 0,
					additionalProperties: {
						cancellationReason: 'No longer traveling',
						messageToDriver: "Sorry I can't make it!!!"
					}
			}
			```
    2. All other passengers, if any, are notified about the cancellation. This notification ONLY includes the additional property: `cancellationReason`.  
	3. The passenger who cancelled is removed from the ride, and a new spot is freed up.
	4. The passenger who cancelled receive the following penalty:
		-  `ridesCancelled` property is incremented

**body**

- `ride`: ride object that the logged in user is trying to cancel
- `cancellationReason`: String when the user selects from a drop-down of cancellation reasons
- `messageToDriver`: in the case of a passsenger cancellation, send a message to the driver - optional field, omit from body if user does not type any message into the form

```

{
    "ride": {
        "_id" : "5e649bba9e2f6d3570e88462",
        "passengers" : [
            "user1"
        ],
        "ownerEmail" : "user2@g.ucla.edu.com",
        "ownerUsername" : "user2",
        "ownerPhoneNumber" : "1231231234",
        "from" : "Los Angeles",
        "to" : "Irvine",
        "date" : "2020-03-05T08:00:00.000Z",
        "price" : "20",
        "seats" : 4,
        "detail" : "rider1_past, driver2_past",
        "_v" : 0
    },
    "messageToDriver": "Sorry for cancelling!",
    "cancellationReason": "Change of travel plans"
}

```

**return value**

- 200 status, with a short **description of the event** that occurred. - For example, the following Strings are possible return values: - "Driver cancelled ride without penalty because there were no passengers." - "Driver cancelled ride and received a penalty because there were passengers." - "Passenger cancelled ride and received a penalty."
- 500 status, with an object containing `error` property. - For example, the following errors are possible messages: - "Ride does not exist in database!" - "User is not a driver or passenger of this ride."

---

**return value**

200 status, with a short description of the event that occurred.

For example, the following events are possible return values:

1. "Driver cancelled ride without penalty because there were no passengers."
2. "Driver cancelled ride and received a penalty because there were passengers."
3. "Passenger cancelled ride and received a penalty."

500 status, with an object containing `error` property.

For example, the following errors are possible messages:

1. "Ride does not exist in database!"
2. "User is not a driver or passenger of this ride."

---

### Delete a ride

DELETE request

**body**

The ride object that the user is trying to delete (The ride object's owner has to be the logged in user):

```

{
    "ride" : {
        "passengers": [
            "bin315a1"
        ],
        "_id": "5d505f0d5482ec4e38597cdd",
        "ownerEmail": "bin315a1@gmail.com",
        "ownerUsername": "bin315a1",
        "ownerPhoneNumber": "1231231234",
        "from": "Irvine",
        "to": "Los Angeles",
        "date": "2019-08-30T00:00:00.000Z",
        "price": "20",
        "seats": 4,
        "detail": "Second test for post",
        "__v": 0
    }
}

```

**return value**

200 status with a debrief of action:

```

    {
        "n": 1,
        "ok": 1,
        "deletedCount": 1
    }

```

---

### Noti Model

### Schema

| column               | type    | required | description                                 |
| -------------------- | ------- | -------- | ------------------------------------------- |
| username             | String  | Yes      |                                             |
| email                | String  | Yes      |                                             |
| msg                  | String  | Yes      |                                             |
| viewed               | Boolean | Yes      |                                             |
| additionalProperties | Mixed   |          | fields specific to the type of notification |

### API Endpoints

| url                      | HTTP Method | description                                                         |
| ------------------------ | ----------- | ------------------------------------------------------------------- |
| /notis/get-driverNotis   | GET         | [Get the notification for driver](#get-driver-notification)         |
| /notis/create-driverNoti | POST        | [Create a new notification for driver](#create-driver-notification) |
| /notis/view-driverNoti   | PUT         | [Modify a notification for driver](#view-driver-notification)       |

---

### Get Driver Notification

GET request

**params/body**

none needed

**return value**

200 status

```

[
    {
        "viewed": false,
        "_id": "5d55bb66261da0092430c990",
        "username": "bin315a1",
        "msg": "bin315a1 has joined your ride",
        "senderEmail": "bin315a1@g.ucla.edu",
        "date": "2019-08-15T20:07:02.242Z",
        "__v": 0
    },
    {
        "viewed": false,
        "_id": "5d55bb485457802c949bb8f4",
        "username": "bin315a1",
        "msg": "bin315a1 has joined your ride",
        "senderEmail": "bin315a1@g.ucla.edu",
        "date": "2019-08-15T20:06:32.716Z",
        "__v": 0
    }
]

```

---

### View Driver Notification

PUT request

- After a notification is viewed, it is deleted after a **week**

**params/body**

none needed

**return value**

modifies the "viewed"(set as false by default) field of all notificationsof the user as true, the "nModified" field shows how many noti objects have been set as seen

200 status

```

{
    "n": 9,
    "nModified": 2,
    "ok": 1
}

```

---

### Get available cities

GET request

**return value**

200 status with a list of available cities that drivers can use to post a ride:

```

[
    "cityA",
    "cityB",
    ...
    "cityZ"
]

```

---

### Get available counties

GET request

**return value**

200 status with a list of available counties that riders can use to search for a ride:

```

[
    "countyA",
    "countyB",
    ...
    "countyC"
]

```

---

### Review Model

### Schema

| property           | type     | required |
| ------------------ | -------- | -------- |
| _reviewerUsername_ | String   | Yes      |
| _revieweeUsername_ | String   | Yes      |
| _rideId_           | ObjectId | Yes      |
| datePosted         | Date     |          |
| rating             | Number   |          |
| comment            | String   |          |
| isDeclined         | Boolean  |          |

- Italicized properties uniquely identify a Review document
- A Review document describes whether a reviewer chooses to review a reviewee, and if so, provides the details of the review
- Details on whether the users are drivers or riders in a carpooling session are abstracted

---

### API Endpoints

| url                                   | HTTP Method | description                                                 |
| ------------------------------------- | ----------- | ----------------------------------------------------------- |
| /reviews                              | POST        | [Add a review ](#add-review)                                |
| /reviews                              | GET         | [Get all of a user's reviews](#get-all-reviews)             |
| /reviews/decline-review               | POST        | [Decline to review a user](#decline-to-review)              |
| /reviews/get-eligible-users-to-review | GET         | [Get list of users to review](#get-list-of-users-to-review) |

---

### Add Review

POST request

- Add a review using the currently logged in account as the reviewer

**params/body**

- Required fields: revieweeUsername, rideId, and rating

```

    {
        "revieweeUsername": "elin4046",
        "rideId": "507f1f77bcf86cd799439011",
        "rating": 1,
        "comment": "Driver arrived really late and was super rude!"
    }

```

**return value**

- 200 status code w/ data on the newly created document
- 500 status code w/ database errors or in the case of duplicate reviews

```

{
    "isDeclined": false,
    "_id": "5e1e997e67eae745e865a233",
    "reviewerUsername": "admin",
    "revieweeUsername": "elin4046",
    "rideId": "507f1f77bcf86cd799439011",
    "rating": 1,
    "comment": "Driver arrived really late and was super rude!",
    "datePosted": "2020-01-15T04:47:58.738Z",
    "__v": 0
}

```

---

### Get all reviews

GET request

- Get all publically available reviews received by a user with pagination beginning with 0

GET request

- Get all reviews received by a user

**params/body**

username, pageNum

**example**

localhost:3000/reviews?username=elin4046

**return value**

- 200 status code - A list of publically available review documents made to the user, empty [] if none exist.

```

[
    {
        "isDeclined": false,
        "_id": "5e1ea29e94b3263a60b162da",
        "revieweeUsername": "elin4046",
        "rideId": "507f1f77bcf86cd799439012",
        "rating": 1,
        "comment": "Driver arrived really late and was super rude!",
        "reviewerUsername": "admin",
        "datePosted": "2020-01-15T05:26:54.837Z",
        "__v": 0
    },
    {
        "isDeclined": false,
        "_id": "5e1ea2e494b3263a60b162db",
        "revieweeUsername": "elin4046",
        "rideId": "507f1f77bcf86cd799439013",
        "rating": 4,
        "comment": "A super laid back guy. We had a great conversation the whole time.",
        "reviewerUsername": "admin",
        "datePosted": "2020-01-15T05:28:04.757Z",
        "__v": 0
    }
]

```

---

### Decline to review

POST request

- Indicate the currently logged in user's decision to not review another user after being prompted to do so
- This is important to prevent any further notifications

**params/body**

- revieweeUsername and the ride's rideId

**example**

```

{
    "revieweeUsername": "john_smith",
    "rideId": "507f191e810c19729de860ea"
}

```

---

### Get list of users to review

GET request

- Get a list of users that the currently logged in user can leave reviews by specifying a rideId
- For example:
  - If a user was a driver in the ride, the request will return each of his/her passengers's user documents
  - If a user was a passenger in the ride, the request will return the driver's user document
  - If a user has previously **declined** an opportunity to review a passenger, that passenger's user information will not be returned. After 7 days of being notified to leave a review, the user automatically declines to review a passenger if he has not reviewed yet.

**params/body**

- rideId as a query

**return value**

- An object containing a list of eligible usernames for review. These usernames can be used to query for additional information, such as profile picture.

```

{
        usersToReview: [
          {
            stripe: [Object],
            driver: [Object],
            rating: [Object],
            picType: 'png',
            isRegistered: false,
            createdAt: 2020-04-08T05:47:55.927Z,
            ridesCancelled: 0,
            ridesCompleted: 0,
            _id: 5e8d658c4b2e974b1c83fd5a,
            username: 'passenger_1',
            __v: 0
          },
          {
            stripe: [Object],
            driver: [Object],
            rating: [Object],
            picType: 'png',
            isRegistered: false,
            createdAt: 2020-04-08T05:47:55.927Z,
            ridesCancelled: 0,
            ridesCompleted: 0,
            _id: 5e8d658c4b2e974b1c83fd5b,
            username: 'passenger_2',
            __v: 0
          }
        ]
      }

```

---

### Request Model

### Schema

| column      | type     | required | properties |
| ----------- | -------- | -------- | ---------- |
| rideID      | ObjectID | Yes      |            |
| requesterUsername    | String   | Yes      |            |
| requesteeUsername | String   | Yes      |            |
| status      | String   | Yes      |            |
| archived    | Boolean  | Yes      |            |
| reminders   | Number   | No       |            |
| carryOn     | Number   | No       |            |
| luggage     | Number   | No       |            |
| msg         | String   | No       |            |
| date        | Date     | No       |            |

### API Endpoints

| url                | HTTP Method | description                               |
| ------------------ | ----------- | ----------------------------------------- |
| /request/info      | GET         | [Request Information](#request-info)      |
| /request/remind    | GET         | [Remind Driver](#remind-driver)           |
| /request/requester    | GET         | [Requester Requests](#requester-requests)       |
| /request/requestee | GET         | [Requestee Requests](#requestee-requests) |
| /request/new       | POST        | [Create New Request](#create-request)     |
| /request/approve   | PUT         | [Approve Request](#approve-request)       |
| /request/cancel    | PUT         | [Cancel Request](#cancel-request)         |
| /request/deny      | PUT         | [Deny Request](#deny-request)             |
| /request/archive   | PUT         | [Archive Request](#archive-request)       |

### Statuses

- Pending: This status reflects the state where a rider has requested a ride, and the driver has yet to respond
- Approved: This status reflects the state where a driver has approved an already existing user's request
- Denied: This status reflects the state where a driver has denied an already existing user's request
- Cancelled: This status reflects the state where a rider has cancelled his initial request

### Request Info

Request Info

- Get a Request's information

**query params**

```

    requestID = <String>

```

**return value**

200 status if successful

---

### Remind Driver

Remind Driver

- Reminds a Driver to Approve the request

**query params**

```

    requestID = <String>

```

**return value**

200 status if successful

---

### Requester Requests

GET request

- Get a requester's requests with the given status

**query params**

```

    requesterUsername: <String>,
    status: <String>,
    // requesterUsername is the username to get that user's requests that they sent
    // status value of "all" returns all status types,
    // "visible" displays everything but archived requests

```

**return value**

200 ok status with data of all matching requests

---

### Requestee Requests

GET request

- Get a requestee's requests with the given status

**query params**

```
{
    requesteeUsername: <String>,
    status: <String>,
    // requesteeUsername is the username to get requests that other users sent to this user
    // status value of "all" returns all status types,
    // "visible" displays everything but archived requests
}
```

**return value**

200 ok status with data of all matching requests

---

### Create Request

POST request

- Create a request

**body**

```
{
    requesterUsername: <String>,
    rideID: <String>,
    requesteeUsername: <String>,
    msg: <String>
}
```

**return value**

201 created status with the request id for later use

```
    {
        requestID: <request id here>
    }
```

---

### Approve Request

PUT request

- Change the status of a request to "approved"

**query params (req.body.params.<field>)**

```

    requestID = <String>

```

**return value**

200 status if successful

---

### Deny Request

PUT request

- Change the status of a request to "denied"

**query params (req.body.params.<field>)**

```

    requestID = <String>

```

**return value**

200 status if successful

---

### Cancel Request

PUT request

- Change the status of a request to "cancelled"

**query params (req.body.params.<field>)**

```

    requestID = <String>

```

**return value**

200 status if successful

---

### Archive Request

PUT request

- Change the status of a request to "archived"

**query params (req.body.params.<field>)**

```

    requestID = <String>

```

**return value**

200 status if successful

---

### Stripe Model

### API Endpoints

| url                 | HTTP Method | description                                                                                                          |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| /stripe/token       | GET         | [Process Stripe account authoriation code and complete driver onboarding](#Process-Stripe-Account-Authoriation-Code) |
| /stripe/driver/auth | POST        | [Prepare for redirect to Stripe express account signup](#Prepare-for-redirect-to-stripe)                             |

---

### Process Stripe Account Authoriation Code

GET request

- This endpoint is called by Stripe after a user completes the stripe account signup process. The token is used to make a request to Stripe get the user's Stripe Account Id.
- The driver's information (phone number, drivers license, license plate, vehicle model) was stored in a cookie when /stripe/driver/auth was called and the user's page was redirected to Stripe. This information, along with the Stripe account Id, is then stored in the database for the user that is logged in.
- More information on this process can be found on Stripe's documentation: https://stripe.com/docs/connect/express-accounts

**body**

```

{
    "token": "ac_GwlrGacQIGKsSlSBdhis7vBHq7GKqiH4",
    "state": "csjf6b4g1ft"
}

```

**return value**

```
{
    redirectUrl: "https://connect.stripe.com/express/oauth/authorize?client_id={CLIENT_ID}&state={STATE_VALUE}&stripe_user[email]=user@example.com"
}
```

---

### Prepare for Redirect to Stripe

POST request

- Accepts the drivers info (phone number, drivers license, license plate, vehicle model), stores it in a cookie, and returns a URL that is used to redirect to Stripe's account setup.

**params**

```
{
    phoneNumber: "8054036772",
    licensePlate: "csjf6b4g1ft",
    vehicleMakeModel: "Toyota Rav4,
    driversLicense: "Y9922030",
    vehicleColor: "Red"
}
```

**return value**

- On Success
  - Redirects page to /driver/my-drives
- On Error
  - Redirects page to /driver

---

# Deployment

## Deployment Instructions

Currently the website uses Netlify for frontend's deployment and AWS for backend's deployment. Backend Node application uses systemd to maintain app's continuous execution.

**Only the current engineering manager/ specified deployment manager should be able to access deployment servers**

**The servers are set to run continuously; unless there is a major patch or a server malfunction, do not run the following deployment instructions**

### Connecting to AWS EC2 instance

Ask your current engineering manager for the PEM key file, and connect to the instance via SSH with instructions that can be found online.
For root access, also ask your current engineering manager for root access privelages.

### Starting the web server in EC2

1. Switch to root user with:
   `sudo su`
2. Start mongodb daemon with:
   `sudo service mongod start`
3. Start the Node application service with:
   `systemctl start node-80`
   if it indicates an error in mongoose connection, make sure that mongodb.service is running correctly
4. Check that the service is up and running by listing all current running services with:
   `systemctl -r --type service --all`
   and check that node-80.service is active and running

- systemd service file's (for NodeJS app) location:
  /etc/systemd/system/node-80.service
- systemd's environment file's location:
  /root/sec/bruinPool_Backend_envFile
- the application is set to use the port 8080 (http); environment variable for the service is set for port 3000, but NGINX proxies it to port 8080
- the .env file in the server's repo doesn't have to be updated for the web server to work, but can be used with `npm run dev` if the server fails to run node-80.service and you need to check the error log

Further Resources regarding systemctl:
https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1/
