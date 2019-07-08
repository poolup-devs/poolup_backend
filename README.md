# BruinPool Backend

This is the backend code repository for Bruinpool: made with NodeJS, Express, and MongoDB w/ Mongoose.
For additional guidence/help, email bin315a1@g.ucla.edu or your current Engineering Manager.

## Local Environment Setup

1. Install nodeJS by following installation guides from https://nodejs.org/en/download/
2. Clone the repository to your local environment using `git clone https://github.com/bruinpool-devs/BruinPool_backEnd.git`
3. Install all used packages & dependencies using:
   `npm install`
4. Install mongoDB by following installation guides from:
   Mac: https://treehouse.github.io/installation-guides/mac/mongo-mac.html
   Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/

This is different from the npm package listed in package.json: which is the driver that connects the DB to the nodeJS app.
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
   `systemctl start node-5000`
   if it indicates an error in mongoose connection, make sure that mongodb.service is running correctly
4. Check that the service is up and running by listing all current running services with:
   `systemctl -r --type service --all`
   and check that node-5000.service is active and running

- systemd service file's (for NodeJS app) location:
  /etc/systemd/system/node-5000.service
- the application is set to use the port 5000, a custom TCP Rule set in the AWS console under "Security Groups->Group Name:Node"

Further Resources regarding systemctl:
https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1/
