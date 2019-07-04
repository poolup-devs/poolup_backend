# BruinPool Backend

This is the backend code repository for Bruinpool: made with NodeJS, Express, and MongoDB w/ Mongoose.
For additional guidence/help, email bin315a1@g.ucla.edu or your current Engineering Manager.

## Local Environment Setup

1. Install nodeJS by following installation guides from https://nodejs.org/en/download/
2. Install all used packages & dependencies using:
   `npm install`
3. Install mongoDB by following installation guides from:
   Mac: https://treehouse.github.io/installation-guides/mac/mongo-mac.html
   Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/

This is different form the npm package listed in package.json: which is the driver that connects the DB to the nodeJS app.
For choosing the inital db location, just use the default --dbpath=/data/db to prevent future confusion

## Local Development Setup

1. Open a terminal, and run the command `mongod` to start the mongodb daemon - may have to run `sudo mongod` for permission purposes
2. Open another terminal and run `npm run dev` in the home directory; this starts the backend application with nodemon
3. The local backend development port is set to 3000, now use Postman to test API endpoints.

## Additional Tools

1. Install Postman to test backend REST APIs
   Here's a link to a sample set of HTTP requests w/Postman: press the import buttwon on upper left, and use the url https://www.getpostman.com/collections/bcd0df61c8abfc805865
2. Install Robo 3T for mongoDB GUI and create a new connection to the DB using port 27017, the default mongoDB port

## Directory Structure

    .
    ├── node_modules
    ├── src
    │   ├── db
    |   |   └── noti.js
    │   ├── models
    |   |   ├── noti.js
    |   |   ├── ride.js
    |   |   └── user.js
    │   ├── tests
    │   └── server.js
    ├── package-lock.json
    └── package.json

## Models & API Endpoints Documentation

### Model: User

#### Schema

| column      | type   |
| ----------- | ------ |
| email       | String |
| username    | String |
| password    | String |
| phoneNumber | String |
| driverList  | Array  |
| riderList   | Array  |
| picUrl      | String |
| authToken   | String |

#### API Endpoints

| url                    | HTTP Method | description                                 |
| ---------------------- | ----------- | ------------------------------------------- |
| /login                 | GET         | User Login                                  |
| /signup                | POST        | User Signup                                 |
| /emailValidation       | GET         | Validation/usability of Email               |
| /usernameValidation    | GET         | Validation/usability of a username          |
| /phoneNumberValidation | GET         | Validation/usability of a phone number      |
| /upload-profile-pic    | POST        | upload a user profile image                 |
| /usersPic              | GET         | Get a user's profile image                  |
| /updateUser            | POST        | Update user data; NOT IMPLEMENTED IN DB YET |

##### User Login

##### User Signup

##### Validation/usability of Email

##### Validation/usability of a username

##### Validation/usability of a phone number

##### upload a user profile image

##### Get a user's profile image

##### Update user data; NOT IMPLEMENTED IN DB YET

### Model: Ride

#### Schema

| column           | type   |
| ---------------- | ------ |
| ownerEmail       | String |
| ownerUsername    | String |
| ownerPhoneNumber | String |
| from             | String |
| to               | String |
| date             | Date   |
| price            | String |
| seats            | Number |
| detail           | String |
| passengers       | Array  |

#### API Endpoints

| url       | HTTP Method | description           |
| --------- | ----------- | --------------------- |
| /rideList | GET         | Get list of rides     |
| /rideList | POST        | Post a ride           |
| /rideList | PUT         | Modify data of a ride |
| /rideList | DELETE      | Delete a ride         |

##### Get list of rides

##### Post a ride

##### Modify data of a ride

##### Delete a ride

### Model: Noti

#### Schema

| column               | type    |
| -------------------- | ------- |
| email                | String  |
| msg                  | String  |
| passengerPhoneNumber | String  |
| passengerEmail       | String  |
| viewed               | Boolean |

#### API Endpoints

| url           | HTTP Method | description           |
| ------------- | ----------- | --------------------- |
| /notification | GET         | Get the notification  |
| /notification | PUT         | Modify a notification |

##### Get the notification

##### Modify a notification
