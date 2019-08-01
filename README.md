# BruinPool Backend

### api.bruinpool.io

This is the backend code repository for Bruinpool: made with NodeJS, Express, and MongoDB w/ Mongoose.
For additional guidence/help, email bin315a1@g.ucla.edu or your current Engineering Manager.

## Local Environment Setup

1. Install nodeJS by following installation guides from https://nodejs.org/en/download/
2. Clone the repository to your local environment using `git clone https://github.com/bruinpool-devs/bruinpool_backend.git`
3. Install all used packages & dependencies using:
   `npm install`
4. To connect to the development s3 bucket, run:
   `npm run setup`
   , which would create the file .env in the root directory. There, enter the bucket name, access key, and the secret access key assigned from the engineering manager and save.

   !!!Make sure NOT to remove .env in .gitignore; publishing access keys publically causes bigger problems!!!

5. Install mongoDB by following installation guides from:
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
   Here's a link to a sample set of HTTP requests w/Postman: press the import button on upper left, and use the url https://www.getpostman.com/collections/bcd0df61c8abfc805865
2. Install Robo 3T for mongoDB GUI and create a new connection to the DB using port 27017, the default mongoDB port

## Directory Structure

    .
    ├── node_modules
    ├── src
    │   ├── db
    |   |   └── index.js
    │   ├── noti
    |   |   ├── noti.js
    |   |   └── index.js
    │   ├── ride
    |   |   ├── ride.js
    |   |   └── index.js
    │   └── user
    |       ├── user.js
    |       └── index.js
    ├── tests
    ├── package-lock.json
    └── package.json

## Auth Tokens

For all API requests after login, the bearer token must be included in headers for authorization.

| Key           | Value               |
| ------------- | ------------------- |
| Authorization | Bearer <Auth token> |

There must be a white space between the string "Bearer" and the token string

## Models & API Endpoints Documentation

### Model: User

### Schema

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

### API Endpoints

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

---

### User Login

##### Initial Login:

GET request

**params**
email, password, type(=login)

**example**
/login?email=sampleEmail1@gmail.compassword=samplePassword1&type=login

**return value**
200 status, returns a user object

##### Cookie Login:

GET request;
This must be after the initial login request since you need the authToken value generated from that step

**params**
email, password, type(=cookie), authToken(copied from the authToken value acquired from the returned user object of initial login request)

**example**
localhost:3000/login?email=sampleEmail1@gmail.com&password=samplePassword1&type=cookie&authToken={"authToken": "979a3a3c7e590f8d84af2df7d6c9b442d36483c7f920aa39320bdcf88170c6e1"}

---

### User Signup

POST request

**Body**

```
{
	"password": "samplePassword1",
	"email":"sampleEmail1@gmail.com",
	"username" : "sampleUser1",
	"phoneNumber": "1231231234"
}
```

**return value**
200 status, message: `User Created Successfully`

---

### Validation/usability of Email

Get request

**params**
email

**example**
localhost:3000/emailValidation?email=sampleEmail1@gmail.com

**return value**
array of user objects with that email

---

### Validation/usability of a username

GET request

**params**
username

**example**
localhost:3000/usernameValidation?username=sampleUser1

**return value**
array of user objects with that username

---

### Validation/usability of a phone number

GET request

**params**
phoneNumber

**example**
localhost:3000/phoneNumberValidation?phoneNumber=1231231234

**return value**
array of user objects with that username

---

### upload a user profile image

POST request

**Body**

```
{
    "file": <img file>
}
```

**return value**
200 OK status code if successfully uploaded to S3 bucket; if not, error

---

### Get a user's profile image

GET request

**params**
username (not id)

**example**
localhost:3000/usersPic?username=sampleUser1

**return value**
Accessible URL to the img file in S3 bucket

---

### Update user data; NOT IMPLEMENTED IN DB YET

not functional yet

---

### Model: Ride

### Schema

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

### API Endpoints

| url       | HTTP Method | description           |
| --------- | ----------- | --------------------- |
| /rideList | GET         | Get list of rides     |
| /rideList | POST        | Post a ride           |
| /rideList | PUT         | Modify data of a ride |
| /rideList | DELETE      | Delete a ride         |

---

### Get list of rides

GET request

12 types of requests:

---

1. "rideFeed"

**parmas**
type=rideFeed, pageNum, filter

**example**

localhost:3000/rideList?type=rideFeed&pageNum=1&filter={ "from" : "Irvine", "to":"Los Angeles" , "date":"2019-04-20 00:00:00.000Z"}

**return value**

List of 'top 10\*pageNum' available earliest rides according to the filter

---

2. "rideFeedMore"

If filter exists:

same as "rideFeed", but skips the first '10\*pageNum' results

If filter is undefined:

returns all rides that are currently available, skips the first 10 results

---

3. "driveHistory"

**params**
type=driveHistory, userInfo, pageNum

**example**
localhost:3000/rideList?userInfo={"username":"bin315a1"}&type=driveHistory

**return value**
list of (top 10\*pageNum) all the rides the specified user had driven (prior to the currnet date&time)

---

4. "driveHistoryMyAccount"
   -expected to be depricated as code is exaclty the same as "driveHistory"

---

5. "driveHistoryMore"
   same as "driveHistory", but skipping the first (10\*pageNum) results

---

6. "driveUpcoming"

**params**
type=driveUpcoming, userInfo

**example**
localhost:3000/rideList?userInfo={"username":"bin315a1"}&type=driveUpcoming

**return value**
returns 3 earliest upcoming future drives that the specified user has

---

7. "rideHistory"

**params**
type=rideHistory, userInfo

- INCOMPLETE

---

8. "rideHistoryMyAccount"

- expected to be deprecated

---

9. "rideUpcoming"

**params**
type=rideUpcoming, userInfo

- INCOMPLETE

---

10. "fetchHistoryTotal"

- INCOMPLETE

---

11. n/a

**params/body**
pageNum

**return value**
return list of all available rides without filtering

---

### Post a ride

---

### Modify data of a ride

---

### Delete a ride

---

### Model: Noti

### Schema

| column               | type    |
| -------------------- | ------- |
| email                | String  |
| msg                  | String  |
| passengerPhoneNumber | String  |
| passengerEmail       | String  |
| viewed               | Boolean |

### API Endpoints

| url           | HTTP Method | description           |
| ------------- | ----------- | --------------------- |
| /notification | GET         | Get the notification  |
| /notification | PUT         | Modify a notification |

---

### Get the notification

---

### Modify a notification

---

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
   `systemctl start node-8080`
   if it indicates an error in mongoose connection, make sure that mongodb.service is running correctly
4. Check that the service is up and running by listing all current running services with:
   `systemctl -r --type service --all`
   and check that node-8080.service is active and running

- systemd service file's (for NodeJS app) location:
  /etc/systemd/system/node-8080.service
- systemd's environment file's location:
  /root/sec/bruinPool_Backend_envFile
- the application is set to use the port 8080 (http); environment variable is set for port 80, but NGINX proxies it to port 8080

Further Resources regarding systemctl:
https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1/
