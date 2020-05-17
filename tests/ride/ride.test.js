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
      // const username = "driver";
      // await User.create({ username: username });
      let ride = sampleRide;
      ride.ownerUsername = "bogusUsername";
      // const newRide = await db.postRide(ride, username);

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
      // const driver = await User.create({
      //   username: "driverUsername",
      //   email: "driver@ucla.edu",
      // });
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

  describe("Testing querying of rides", () => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 2);

    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 2);
    const oldestDate = new Date();
    oldestDate.setDate(now.getDate() - 3);

    let pastRideFromSacramentoToGoleta;
    let pastRideFromNorwalkToFresno;
    let pastRideFromIrvineToLosAngeles;
    let pastRideFromLosAngelesToWestCovina;
    let pastRideFromLosAngelesToRiverside;
    let pastRideFromSantaBarbaraToOntario;

    let rideFromGoletaToWestCovina;
    let rideFromGoletaToIrvine;

    beforeEach(async () => {
      // Past Rides
      pastRideFromSacramentoToGoleta = await Ride.create({
        ownerUsername: "driverUsername",
        date: oldestDate,
        passengers: ["passenger1"],
        from: "Sacramento",
        to: "Goleta",
      });
      pastRideFromNorwalkToFresno = await Ride.create({
        ownerUsername: "driverUsername",
        date: pastDate,
        passengers: ["passenger1"],
        from: "Norwalk",
        to: "Fresno",
      });
      pastRideFromIrvineToLosAngeles = await Ride.create({
        ownerUsername: "driverUsername",
        from: "Irvine",
        to: "Los Angeles",
        date: pastDate,
        passengers: ["passenger1"],
      });
      pastRideFromLosAngelesToWestCovina = await Ride.create({
        ownerUsername: "driverUsername",
        from: "Los Angeles",
        to: "West Covina",
        date: pastDate,
        passengers: ["passenger1"],
      });
      pastRideFromLosAngelesToRiverside = await Ride.create({
        ownerUsername: "driverUsername",
        from: "Los Angeles",
        to: "Riverside",
        date: pastDate,
        passengers: ["passenger1"],
      });
      pastRideFromSantaBarbaraToOntario = await Ride.create({
        ownerUsername: "driverUsername",
        from: "Santa Barbara",
        to: "Ontario",
        date: pastDate,
        passengers: ["passenger1"],
      });

      // Future Rides
      // SB -> LA
      rideFromGoletaToWestCovina = await Ride.create({
        ownerUsername: "driverUsername",
        from: "Goleta",
        to: "West Covina",
        date: futureDate,
        price: "20",
        seats: 4,
        passengers: ["passenger1"],
      });

      // SB -> OC
      rideFromGoletaToIrvine = await Ride.create({
        ownerUsername: "driverUsername",
        from: "Goleta",
        to: "Irvine",
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
        const driver1 = await User.create({
          username: "driverUsername1",
          picUrl: "some_url_1",
          picType: "png",
          firstName: "John",
          lastName: "Smith",
        });
        const driver2 = await User.create({
          username: "driverUsername2",
          picUrl: "some_url_2",
          picType: "png",
          firstName: "Sarah",
          lastName: "Smith",
        });
        const ride1 = await Ride.create({
          ownerUsername: "driverUsername1",
          date: new Date(),
          seats: 3,
        });
        const ride2 = await Ride.create({
          ownerUsername: "driverUsername2",
          date: new Date(),
          seats: 3,
        });
        const rides = await db.addDriverInfoToRides([ride1, ride2]);
        expect(rides[0]).toEqual(
          expect.objectContaining({
            picUrl: driver1.picUrl,
            picType: driver1.picType,
            firstName: driver1.firstName,
            lastName: driver1.lastName,
          })
        );
        expect(rides[1]).toEqual(
          expect.objectContaining({
            picUrl: driver2.picUrl,
            picType: driver2.picType,
            firstName: driver2.firstName,
            lastName: driver2.lastName,
          })
        );
      });
    });

    describe("Testing the generation of ride filters", () => {
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
          const rideHistory = await db.getRideHistory(userWithNoRides.username);
          expect(rideHistory.length).toBe(0);
        });

        test("A user who has been a passenger should have a list of past rides in their ride history", async () => {
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
    });
  });
});
