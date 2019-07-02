#BruinPool Backend

#Local Environment Setup
1. Install nodeJS by following installation guides from https://nodejs.org/en/download/
2. Install all used packages & dependencies using:
    `npm install`
3. Install mongoDB by following installation guides from:
Mac: https://treehouse.github.io/installation-guides/mac/mongo-mac.html
Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
 - this is different form the npm package listed in package.json, which is the driver that connects the DB to the nodeJS app.

#Local Development Setup
1. Open a terminal, and run the command `mongod` to start the mongodb daemon - may have to run `sudo mongod` for permission purposes
2. In the home directory, run npm start
3. The local backend development uses the port 3000
4. 

#Additional Tools
1. Install Robo 3T for mongoDB GUI, and connect the DB
2. Install Postman to test backend REST APIs