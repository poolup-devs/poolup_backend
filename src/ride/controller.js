const Ride = require("./ride").Ride;
const Noti = require("../noti/noti.js").Noti;

///////////////////////////////////////////////////////////////
///////////GET RIDES///////////////////////////////////////////
///////////////////////////////////////////////////////////////

const getMatchingRides = (filter_, pageNum, callback) => {
  if (filter_) {
    const filter = JSON.parse(filter_);
    console.log(filter);
    Ride.find(
      { from: filter.from, to: filter.to, date: { $gte: filter.date } },
      (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      }
    )
      .sort({ date: 1 })
      .skip(pageNum * 10)
      .limit(10);
  } else {
    Ride.find({ date: { $gte: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    })
      .sort({ date: 1 })
      .skip(pageNum * 10)
      .limit(10);
  }
};

const getRideHistory = (username, callback) => {
  Ride.find(
    { passengers: username, date: { $lt: new Date() } },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .limit(5);
};

const getMyRideHistory = (authUsername, pageNum, callback) => {
  Ride.find(
    { passengers: authUsername, date: { $lt: new Date() } },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .skip(pageNum * 5)
    .limit(5);
};

const getMyRideUpcoming = (authUsername, callback) => {
  Ride.find(
    { passengers: authUsername, date: { $gte: new Date() } },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .limit(3);
};

///////////////////////////////////////////////////////////////
///////////GET Drives//////////////////////////////////////////
///////////////////////////////////////////////////////////////

const getDriveHistory = (username, callback) => {
  Ride.find(
    { ownerUsername: username, date: { $lt: new Date() } },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .skip(pageNum * 10)
    .limit(10);
};

const getDriveUpcoming = (username, pageNum, callback) => {
  Ride.find(
    { ownerUsername: username, date: { $gte: new Date() } },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .skip(pageNum * 3)
    .limit(3);
};

const postRide = (rideInfo, callback) => {
  Ride.create(rideInfo, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// const fetchMore = (multiplier, callback) => {
//   Ride.find({}, (err, result) => {
//     if (err) {
//       callback(err, null);
//     } else {
//       callback(null, result);
//     }
//   })
//     .sort({ _id: -1 })
//     .skip(multiplier * 18)
//     .limit(18);
// };

const joinRide = (ownerUsername, ride_id, passengerUsername, callback) => {
  const noti = {
    username: ownerUsername,
    msg: `${passengerUsername} has joined your ride`,
    passengerEmail: passengerUsername + "@g.ucla.edu",
    date: new Date()
  };
  Ride.findOneAndUpdate(
    { _id: ride_id, seats: { $gte: 1 } },
    { $push: { passengers: passengerUsername }, $inc: { seats: -1 } },
    { new: true },
    (err1, result1) => {
      if (err1) {
        callback(err1, null);
      } else {
        Noti.create(noti, (err2, result2) => {
          if (err2) {
            callback(err2, null);
          } else {
            callback(null, result1);
          }
        });
      }
    }
  );
};

const cancelRide = (ownerUsername, ride_id, passengerUsername, callback) => {
  const noti = {
    username: ownerUsername,
    msg: `${passengerUsername} has cancelled your ride`,
    passengerEmail: passengerUsername + "@g.ucla.edu",
    date: new Date()
  };
  Ride.findOneAndUpdate(
    { _id: ride_id },
    { $pull: { passengers: passengerUsername }, $inc: { seats: 1 } },
    { new: true },
    (err1, result1) => {
      if (err1) {
        callback(err1, null);
      } else {
        Noti.create(noti, (err2, result2) => {
          if (err2) {
            callback(err2, null);
          } else {
            callback(null, result1);
          }
        });
      }
    }
  );
};

const rideUpdate = (upadatedRide, userInfo, status, callback) => {
  const noti = {
    email: upadatedRide.ownerEmail,
    msg: `${userInfo.username} has ${status}ed a ride`,
    passengerPhoneNumber: userInfo.phoneNumber,
    passengerEmail: userInfo.email,
    viewed: false
  };

  Ride.findOneAndUpdate(
    { _id: upadatedRide._id, seats: { $gte: upadatedRide.passengers.length } },
    upadatedRide,
    { new: true },
    (err1, result1) => {
      if (err1) {
        callback(err1, null);
      } else {
        if (!userInfo.username || !status) {
          callback(null, result1);
        } else {
          Noti.create(noti, (err2, result2) => {
            if (err2) {
              callback(err2, null);
            } else {
              callback(null, result1);
            }
          });
        }
      }
    }
  );
};

const rideDelete = (_id, callback) => {
  Ride.deleteOne({ _id }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

module.exports = {
  getMatchingRides,
  getRideHistory,
  getMyRideHistory,
  getMyRideUpcoming,
  getDriveHistory,
  getDriveUpcoming,
  rideUpdate,
  postRide,
  joinRide,
  cancelRide,
  rideDelete
};
