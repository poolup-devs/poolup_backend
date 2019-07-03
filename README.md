# BruinPool Backend

This is the backend code repository for Bruinpool, made with NodeJS and express.

## Local Environment Setup

1. Install nodeJS by following installation guides from https://nodejs.org/en/download/
2. Install all used packages & dependencies using:
   `npm install`
3. Install mongoDB by following installation guides from:
   Mac: https://treehouse.github.io/installation-guides/mac/mongo-mac.html

Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/

This is different form the npm package listed in package.json, which is the driver that connects the DB to the nodeJS app.

Just use the default --dbpath as /data/db to prevent future confusion

## Local Development Setup

1. Open a terminal, and run the command `mongod` to start the mongodb daemon - may have to run `sudo mongod` for permission purposes
2. In the home directory, run `npm run dev`; this starts the backend application with nodemon
3. The local backend development is set to use the port 3000

## Additional Tools

1. Install Postman to test backend REST APIs
2. Install Robo 3T for mongoDB GUI, and connect the DB

## Models & Controllers

### User

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

####
