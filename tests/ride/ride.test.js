require("../../src/db/mongoose");
const agenda = require("../../src/agenda/agenda");
const User = require("../../src/user/user").User;
const Ride = require("../../src/ride/ride").Ride;
const Noti = require("../../src/noti/noti").Noti;
const Email = require("../../src/user/email/email").Email;
const user_devCon = require("../../src/user/dev_controller");
const app = require("../../src/app");
const request = require("supertest");
const db = require("../../src/ride/controller.js");
const jwt = require("jsonwebtoken");

describe("Testing Ride endpoints", () => {
  afterEach(async () => {
    await Ride.deleteMany({});
    await User.deleteMany({});
    await Noti.deleteMany({});
    await Email.deleteMany({});
  });

  describe("Testing ride posting", () => {
    let sampleRide = {
      ownerEmail: "idc@gmail.com",
      ownerUsername: "",
      from: "Here",
      to: "There",
      date: new Date(),
      price: "20",
      seats: 4,
      detail: "Third test for post",
      passengers: [],
    };

    // Can't post a ride with different username in rideInfo and authUsername
    test("Can't post a ride with different username in rideInfo and authUsername", async () => {
      const user_obj = user_devCon.dev_createDummyUserObj("driver");
      const user = user_devCon.dev_createRegisteredUser(user_obj);
      let ride = sampleRide;
      ride.ownerUsername = "bogusUsername";

      const userAuthToken = jwt.sign(
        { username: user.username, _id: user._id },
        process.env.JWT_SECRET_KEY
      );

      await request(app)
        .post("/rides/post-ride")
        .send({ rideInfo: ride })
        .set("Authorization", "Bearer " + userAuthToken)
        .expect(403);
    });
  });

  describe("Testing when a user joins a ride", () => {
    let sampleRide = {
      ownerEmail: "idc@gmail.com",
      ownerUsername: "",
      from: "Here",
      to: "There",
      date: new Date(),
      price: "20",
      seats: 4,
      detail: "Third test for post",
      passengers: [],
    };

    test("Expect when a user joins a ride, the user is added to the ride's list of passengers, the number of seats is decremented, and a notification is sent to the driver", async () => {
      const passenger = await User.create({ username: "passenger_2" });
      const ownerUsername = "driverUsername";
      let ride = await Ride.create({
        ownerUsername,
        passengers: ["passenger_1"],
        seats: 2,
      });
      const res = await db.joinRide(ride, passenger.username);
      expect(Array.from(res.passengers).sort()).toEqual(["passenger_1", "passenger_2"]);
      expect(res.seats).toBe(1);
      expect(await Noti.findOne({ username: ownerUsername }).lean()).toEqual(
        expect.objectContaining({
          username: ownerUsername,
          msg: "passenger_2 has joined your ride",
        })
      );
    });

    test("The Driver can't join his own ride", async () => {
      const username = "driver";
      await User.create({ username: username });
      let ride = sampleRide;
      ride.ownerUsername = username;
      const newRide = await db.postRide(ride, username);
      try {
        await db.joinRide(newRide, username);
      } catch (err) {
        expect(err.message).toBe("driver of the ride cannot join the ride");
      }
    });

    // ride is full
    test("The ride is full", async () => {
      const username = "rider";
      let ride = sampleRide;
      ride.ownerUsername = username;
      const newRide = await db.postRide(ride, username);
      let i = 0;
      try {
        for (; i < newRide.seats + 3; i++) {
          const username_ = username + i;
          const user = await User.create({ username: username_ });
          await db.joinRide(newRide, user.username);
        }
      } catch (err) {
        expect(i).toBe(newRide.seats);
        expect(err.message).toBe("the ride is full");
      }
    });
  });

  describe("Testing cancellation of rides", () => {
    test("Test cancellation of a ride with passengers as a driver", async () => {
      const driver = await User.create({
        username: "driverUsername",
        email: "driverUsername@ucla.edu",
      });
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1", "passenger2"],
      });

      await db.cancelRide(ride._id, "driverUsername", "No longer traveling");

      // Check whether ride was deleted
      const cancelledRide = await Ride.findOne({
        ownerUsername: ride.ownerUsername,
      });
      expect(cancelledRide).toBe(null);

      // Check incrementation of cancelled rides
      const user = await User.findOne({ username: driver.username });
      expect(user.ridesCancelled).toBe(1);

      // Check creation of notification to each passenger with expected properties
      const noti1 = await Noti.findOne({ username: "passenger1" });
      expect(noti1).toEqual(
        expect.objectContaining({
          username: "passenger1",
          msg: "driverUsername has cancelled your ride",
        })
      );
      expect(noti1.additionalProperties).toEqual({
        cancellationReason: "No longer traveling",
      });

      const noti2 = await Noti.findOne({ username: "passenger2" });
      expect(noti2).toEqual(
        expect.objectContaining({
          username: "passenger2",
          msg: "driverUsername has cancelled your ride",
        })
      );
      expect(noti1.additionalProperties).toEqual({
        cancellationReason: "No longer traveling",
      });
    });

    test("Test cancellation of a ride without passengers as a driver", async () => {
      const driver = await User.create({
        username: "driverUsername",
        email: "driverUsername@ucla.edu",
      });
      const ride = await Ride.create({ ownerUsername: "driverUsername" });

      await db.cancelRide(ride._id, "driverUsername");

      // Check whether ride was deleted
      const cancelledRide = await Ride.findOne({
        ownerUsername: ride.ownerUsername,
      });
      expect(cancelledRide).toBe(null);
    });

    test("Test cancellation of a ride as a passenger", async () => {
      const passenger = await User.create({
        username: "passenger1",
        email: "passenger1@ucla.edu",
      });
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1", "passenger2"],
        seats: 0,
      });
      await db.cancelRide(ride._id, "passenger1", "Other", "Sorry I can't make it!!!");

      // Check whether a notification was sent to the driver
      const driverNoti = await Noti.findOne({ username: "driverUsername" });
      expect(driverNoti).toEqual(
        expect.objectContaining({
          username: "driverUsername",
          msg: "passenger1 has cancelled your ride",
        })
      );
      expect(driverNoti.additionalProperties).toEqual({
        cancellationReason: "Other",
        messageToDriver: "Sorry I can't make it!!!",
      });

      // Check whether passenger was removed from ride
      const cancelledRide = await Ride.findOne({
        ownerUsername: ride.ownerUsername,
      }).lean();
      expect(cancelledRide.seats).toBe(1);
      expect(cancelledRide.passengers).toEqual(["passenger2"]);

      // Check incrementation of cancelled rides
      const user = await User.findOne({ username: passenger.username });
      expect(user.ridesCancelled).toBe(1);
    });

    test("Test error when trying to cancel a ride that the user does not belong to", async () => {
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1"],
        seats: 1,
      });
      expect.assertions(1);
      try {
        await db.cancelRide(ride._id, "userNotInRide");
      } catch (e) {
        expect(e).toBeTruthy();
        return;
      }
    });

    test("Expect a response code of 200 when cancelling a ride as a passenger.", async () => {
      const passenger_obj = user_devCon.dev_createDummyUserObj("passenger1");
      const passenger = await user_devCon.dev_createRegisteredUser(passenger_obj);

      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1"],
        seats: 1,
      });

      const authToken = jwt.sign(
        { username: passenger.username, _id: passenger._id },
        process.env.JWT_SECRET_KEY
      );
      await request(app)
        .put("/rides/cancel-ride")
        .set("Authorization", "Bearer " + authToken)
        .send({
          cancellationReason: "Change of travel plans",
          messageToDriver: "I'm so sorry for cancelling on you! :(",
          ride,
        })
        .expect(200);
    });

    test("Expect a response code of 200 when cancelling a ride as a passenger.", async () => {
      const driver_obj = user_devCon.dev_createDummyUserObj("driverUsername");
      const driver = user_devCon.dev_createRegisteredUser(driver_obj);

      const ride = await Ride.create({
        ownerUsername: driver.username,
        passengers: ["passenger1"],
        seats: 1,
      });
      const authToken = jwt.sign(
        { username: driver.username, _id: driver._id },
        process.env.JWT_SECRET_KEY
      );

      await request(app)
        .put("/rides/cancel-ride")
        .set("Authorization", "Bearer " + authToken)
        .send({ cancellationReason: "Change of travel plans", ride })
        .expect(200);
    });
  });

  describe("Testing posting of a new ride", () => {
    test("After a ride is posted, check whether scheduled jobs were created following ride completion", async () => {
      const now = new Date();
      const ride = await db.postRide(
        {
          ownerUsername: "driverUsername",
          seats: 3,
          date: now,
        },
        "driverUsername"
      );
      const completedRideJob = await agenda.jobs({
        name: "update number of completed rides",
        data: { rideId: ride._id },
      });
      expect(completedRideJob.length).toBe(1);
      const reviewNotificationJob = await agenda.jobs({
        name: "send leave a review web notifications",
        data: { rideId: ride._id },
      });
      expect(reviewNotificationJob.length).toBe(1);

      // clean up the jobs
      await agenda.cancel({ name: "update number of completed rides" });
      await agenda.cancel({ name: "send leave a review web notifications" });
    });
  });

  describe("Testing ride queries", () => {
    const now = new Date();

    const oldestFutureDate = new Date();
    oldestFutureDate.setDate(now.getDate() + 1);
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 2);

    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 2);
    const oldestPastDate = new Date();
    oldestPastDate.setDate(now.getDate() - 3);

    let driver;

    let pastRideFromSacramentoToGoleta;
    let pastRideFromNorwalkToFresno;
    let pastRideFromIrvineToLosAngeles;
    let pastRideFromLosAngelesToWestCovina;
    let pastRideFromLosAngelesToRiverside;
    let pastRideFromSantaBarbaraToOntario;

    let rideFromGoletaToWestCovina;
    let rideFromGoletaToIrvine;
    let rideFromPasadenaToOakland;
    let rideFromLosAngelesToChino;
    let rideFromRiversideToFullerton;
    let rideFromAlhambraToIslaVista;

    beforeEach(async () => {
      driver = await User.create({
        username: "driverUsername",
        picUrl: "some_url_1",
        picType: "png",
        firstName: "John",
        lastName: "Smith",
      });

      // Past Rides
      pastRideFromSacramentoToGoleta = await Ride.create({
        ownerUsername: driver.username,
        date: oldestPastDate,
        passengers: ["passenger1"],
        from: "Sacramento",
        to: "Goleta",
      });
      pastRideFromNorwalkToFresno = await Ride.create({
        ownerUsername: driver.username,
        date: pastDate,
        passengers: ["passenger1"],
        from: "Norwalk",
        to: "Fresno",
      });
      pastRideFromIrvineToLosAngeles = await Ride.create({
        ownerUsername: driver.username,
        from: "Irvine",
        to: "Los Angeles",
        date: pastDate,
        passengers: ["passenger1"],
      });
      pastRideFromLosAngelesToWestCovina = await Ride.create({
        ownerUsername: driver.username,
        from: "Los Angeles",
        to: "West Covina",
        date: pastDate,
        passengers: ["passenger1"],
      });
      pastRideFromLosAngelesToRiverside = await Ride.create({
        ownerUsername: driver.username,
        from: "Los Angeles",
        to: "Riverside",
        date: pastDate,
        passengers: ["passenger1"],
      });
      pastRideFromSantaBarbaraToOntario = await Ride.create({
        ownerUsername: driver.username,
        from: "Santa Barbara",
        to: "Ontario",
        date: pastDate,
        passengers: ["passenger1"],
      });

      // Future Rides
      rideFromGoletaToWestCovina = await Ride.create({
        ownerUsername: driver.username,
        from: "Goleta",
        to: "West Covina",
        date: oldestFutureDate,
        price: "20",
        seats: 4,
        passengers: ["passenger1"],
      });
      rideFromGoletaToIrvine = await Ride.create({
        ownerUsername: driver.username,
        from: "Goleta",
        to: "Irvine",
        date: futureDate,
        price: "20",
        seats: 4,
        passengers: ["passenger1"],
      });
      rideFromPasadenaToOakland = await Ride.create({
        ownerUsername: driver.username,
        from: "Pasadena",
        to: "Oakland",
        date: futureDate,
        price: "20",
        seats: 4,
        passengers: ["passenger1"],
      });
      rideFromLosAngelesToChino = await Ride.create({
        ownerUsername: driver.username,
        from: "Los Angeles",
        to: "Chino",
        date: futureDate,
        price: "20",
        seats: 4,
        passengers: ["passenger1"],
      });
      rideFromRiversideToFullerton = await Ride.create({
        ownerUsername: driver.username,
        from: "Riverside",
        to: "Fullerton",
        date: futureDate,
        price: "20",
        seats: 4,
        passengers: ["passenger1"],
      });
      rideFromAlhambraToIslaVista = await Ride.create({
        ownerUsername: driver.username,
        from: "Alhambra",
        to: "Isla Vista",
        date: futureDate,
        price: "20",
        seats: 4,
        passengers: ["passenger1"],
      });
    });

    describe("Testing adding driver information to each ride", () => {
      test("Expect when passed an empty list of rides, should return an empty list back.", async () => {
        const emptyRides = await db.addDriverInfoToRides([]);
        expect(emptyRides).toEqual([]);
      });

      test("Expect when passed an array of rides, should fill in driver information fields", async () => {
        const rides = await db.addDriverInfoToRides([
          rideFromGoletaToWestCovina,
          rideFromGoletaToIrvine,
        ]);
        expect(rides[0]).toEqual(
          expect.objectContaining({
            picUrl: driver.picUrl,
            picType: driver.picType,
            firstName: driver.firstName,
            lastName: driver.lastName,
          })
        );
        expect(rides[1]).toEqual(
          expect.objectContaining({
            picUrl: driver.picUrl,
            picType: driver.picType,
            firstName: driver.firstName,
            lastName: driver.lastName,
          })
        );
      });
    });

    describe("Testing the generation of matching ride filters", () => {
      test("An undefined filter should result in a query filter that returns all dates past the current date", async () => {
        // Mock out the Date constructor
        const dateSpy = jest.spyOn(global, "Date").mockImplementation(() => now);

        const filter = await db.createRideQueryFilter(undefined);
        expect(filter.date.$gte).toEqual(now);
        dateSpy.mockRestore();
      });

      test("A filter that specifies all fields, should result in a query filter with every from city, to city, and current date", async () => {
        const filter = await db.createRideQueryFilter(
          `{ "from": "Santa Barbara", "to": "Los Angeles", "date_from": "${now.toISOString()}", "date_to": "${futureDate.toISOString()}" }`
        );
        const rides = await Ride.find(filter);
        expect(rides.length).toBe(1);
        expect(rides).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              from: rideFromGoletaToWestCovina.from,
              to: rideFromGoletaToWestCovina.to,
            }),
          ])
        );
      });

      test("A filter that specifies only the `from` field should result in a query filter with all rides from that location past the current date.", async () => {
        const filter = await db.createRideQueryFilter('{ "from": "Santa Barbara" }');
        const rides = await Ride.find(filter);
        expect(rides.length).toBe(2);
        expect(rides).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              from: rideFromGoletaToWestCovina.from,
              to: rideFromGoletaToWestCovina.to,
            }),
            expect.objectContaining({
              from: rideFromGoletaToIrvine.from,
              to: rideFromGoletaToIrvine.to,
            }),
          ])
        );
      });

      test("A filter that specifies only the `to` field should result in a query filter with all rides to that location past the current date.", async () => {
        const filter = await db.createRideQueryFilter('{ "to": "Los Angeles" }');
        const rideFromSanDiegoToSantaMonica = await Ride.create({
          from: "San Diego",
          to: "Santa Monica",
          date: futureDate,
        });
        const rides = await Ride.find(filter);
        expect(rides.length).toBe(2);
        expect(rides).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              from: rideFromGoletaToWestCovina.from,
              to: rideFromGoletaToWestCovina.to,
            }),
            expect.objectContaining({
              from: rideFromSanDiegoToSantaMonica.from,
              to: rideFromSanDiegoToSantaMonica.to,
            }),
          ])
        );
      });
    });

    describe("Testing the retrieval of a user's ride history", () => {
      test("A user with no previous ride history should return an empty list", async () => {
        const userWithNoRides = await User.create({ username: "username" });
        const rideHistory = await db.getRideHistory(userWithNoRides.username, 0);
        expect(rideHistory.length).toBe(0);
      });

      test("A user who has been a passenger should have their latest past rides in their ride history", async () => {
        const rideHistory = await db.getRideHistory("passenger1", 0);
        expect(rideHistory.length).toBe(5);
        // Should not include the oldest date, only latest 5 rides
        expect(rideHistory).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: pastRideFromNorwalkToFresno.ownerUsername,
              from: pastRideFromNorwalkToFresno.from,
              to: pastRideFromNorwalkToFresno.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromIrvineToLosAngeles.ownerUsername,
              from: pastRideFromIrvineToLosAngeles.from,
              to: pastRideFromIrvineToLosAngeles.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromLosAngelesToWestCovina.ownerUsername,
              from: pastRideFromLosAngelesToWestCovina.from,
              to: pastRideFromLosAngelesToWestCovina.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromLosAngelesToRiverside.ownerUsername,
              from: pastRideFromLosAngelesToRiverside.from,
              to: pastRideFromLosAngelesToRiverside.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromSantaBarbaraToOntario.ownerUsername,
              from: pastRideFromSantaBarbaraToOntario.from,
              to: pastRideFromSantaBarbaraToOntario.to,
            }),
          ])
        );
      });

      test("Testing pagination of ride history for a user with more than 5 past rides", async () => {
        const rideHistory = await db.getRideHistory("passenger1", 1);
        expect(rideHistory.length).toBe(1);
        // Oldest ride should show up on the second page
        expect(rideHistory).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: pastRideFromSacramentoToGoleta.ownerUsername,
              from: pastRideFromSacramentoToGoleta.from,
              to: pastRideFromSacramentoToGoleta.to,
            }),
          ])
        );
      });
    });

    describe("Testing the retrieval of rider's upcoming rides", () => {
      test("A user with no upcoming rides should receive no rides.", async () => {
        const upcomingRides = await db.getMyRideUpcoming("userWithNoUpcomingRides", 0);
        expect(upcomingRides.length).toBe(0);
      });

      test("A user with upcoming rides should have their latest upcoming rides in a list", async () => {
        const upcomingRides = await db.getMyRideUpcoming("passenger1", 0);
        expect(upcomingRides.length).toBe(5);
        expect(upcomingRides).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: rideFromGoletaToIrvine.ownerUsername,
              from: rideFromGoletaToIrvine.from,
              to: rideFromGoletaToIrvine.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromPasadenaToOakland.ownerUsername,
              from: rideFromPasadenaToOakland.from,
              to: rideFromPasadenaToOakland.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromLosAngelesToChino.ownerUsername,
              from: rideFromLosAngelesToChino.from,
              to: rideFromLosAngelesToChino.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromRiversideToFullerton.ownerUsername,
              from: rideFromRiversideToFullerton.from,
              to: rideFromRiversideToFullerton.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromAlhambraToIslaVista.ownerUsername,
              from: rideFromAlhambraToIslaVista.from,
              to: rideFromAlhambraToIslaVista.to,
            }),
          ])
        );
      });
      test("Testing pagination of upcoming rides for a user with more than 5 upcoming rides", async () => {
        const upcomingRides = await db.getMyRideUpcoming("passenger1", 1);
        expect(upcomingRides.length).toBe(1);
        // Oldest upcoming ride should show up on the second page
        expect(upcomingRides).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: rideFromGoletaToWestCovina.ownerUsername,
              from: rideFromGoletaToWestCovina.from,
              to: rideFromGoletaToWestCovina.to,
            }),
          ])
        );
      });
    });

    describe("Testing the retrieval of a user's drive history", () => {
      test("A user with no previous drive history should return an empty list", async () => {
        const userWithNoDrives = await User.create({ username: "newDriverUsername" });
        const driveHistory = await db.getDriveHistory(userWithNoDrives.username, 0);
        expect(driveHistory.length).toBe(0);
      });

      test("A user who has been a driver should have their latest drives in their drive history", async () => {
        // Has driven in 6 past rides
        const driveHistory = await db.getDriveHistory(driver.username, 0);
        expect(driveHistory.length).toBe(5);
        // Should not include the oldest date, only latest 5 rides
        expect(driveHistory).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: pastRideFromNorwalkToFresno.ownerUsername,
              from: pastRideFromNorwalkToFresno.from,
              to: pastRideFromNorwalkToFresno.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromIrvineToLosAngeles.ownerUsername,
              from: pastRideFromIrvineToLosAngeles.from,
              to: pastRideFromIrvineToLosAngeles.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromLosAngelesToWestCovina.ownerUsername,
              from: pastRideFromLosAngelesToWestCovina.from,
              to: pastRideFromLosAngelesToWestCovina.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromLosAngelesToRiverside.ownerUsername,
              from: pastRideFromLosAngelesToRiverside.from,
              to: pastRideFromLosAngelesToRiverside.to,
            }),
            expect.objectContaining({
              ownerUsername: pastRideFromSantaBarbaraToOntario.ownerUsername,
              from: pastRideFromSantaBarbaraToOntario.from,
              to: pastRideFromSantaBarbaraToOntario.to,
            }),
          ])
        );
      });

      test("Testing pagination of drive history for a user who has driven more than 5 past rides", async () => {
        const driveHistory = await db.getDriveHistory(driver.username, 1);
        expect(driveHistory.length).toBe(1);
        // Oldest ride should show up on the second page
        expect(driveHistory).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: pastRideFromSacramentoToGoleta.ownerUsername,
              from: pastRideFromSacramentoToGoleta.from,
              to: pastRideFromSacramentoToGoleta.to,
            }),
          ])
        );
      });
    });

    describe("Testing the retrieval of a driver's upcoming drives", () => {
      test("A user with no upcoming rides should receive no rides.", async () => {
        const upcomingDrives = await db.getDriveUpcoming("userWithNoUpcomingDrives", 0);
        expect(upcomingDrives.length).toBe(0);
      });

      test("A user with upcoming drives should have their latest upcoming drives in a list", async () => {
        const upcomingDrives = await db.getDriveUpcoming(driver.username, 0);
        expect(upcomingDrives.length).toBe(5);
        expect(upcomingDrives).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: rideFromGoletaToIrvine.ownerUsername,
              from: rideFromGoletaToIrvine.from,
              to: rideFromGoletaToIrvine.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromPasadenaToOakland.ownerUsername,
              from: rideFromPasadenaToOakland.from,
              to: rideFromPasadenaToOakland.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromLosAngelesToChino.ownerUsername,
              from: rideFromLosAngelesToChino.from,
              to: rideFromLosAngelesToChino.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromRiversideToFullerton.ownerUsername,
              from: rideFromRiversideToFullerton.from,
              to: rideFromRiversideToFullerton.to,
            }),
            expect.objectContaining({
              ownerUsername: rideFromAlhambraToIslaVista.ownerUsername,
              from: rideFromAlhambraToIslaVista.from,
              to: rideFromAlhambraToIslaVista.to,
            }),
          ])
        );
      });

      test("Testing pagination of upcoming drives for a user with more than 5 upcoming drives", async () => {
        const upcomingDrives = await db.getDriveUpcoming(driver.username, 1);
        expect(upcomingDrives.length).toBe(1);
        // Oldest upcoming ride should show up on the second page
        expect(upcomingDrives).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ownerUsername: rideFromGoletaToWestCovina.ownerUsername,
              from: rideFromGoletaToWestCovina.from,
              to: rideFromGoletaToWestCovina.to,
            }),
          ])
        );
      });
    });
  });
});
