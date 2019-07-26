const mongoose = require("mongoose");

const User = require("../user/user").User;
const Ride = require("../ride/ride").Ride;
const Noti = require("../noti/noti").Noti;

mongoose.connect("mongodb://localhost/bruinpool", {
  useNewUrlParser: true
});

const db = mongoose.connection;

db.on("error", () => {
  console.log("mongoose connection error");
});

db.once("open", () => {
  console.log("mongoose connected successfully");
});

const getRide = (query, type, pageNum, callback) => {
  if (type === "rideFeed" && query.filter) {
    const filter = JSON.parse(query.filter);

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
      .limit(10 * pageNum);
  } else if (type === "rideFeedMore" && query.filter) {
    const filter = JSON.parse(query.filter);

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
  } else if (type === "rideFeedMore" && !query.filter) {
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
  } else if (type === "driveHistory") {
    const userInfo = JSON.parse(query.userInfo);

    Ride.find(
      { ownerUsername: userInfo.username, date: { $lt: new Date() } },
      (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      }
    )
      .sort({ date: 1 })
      .limit(10 * pageNum);
  } else if (type === "driveHistoryMyAccount") {
    const userInfo = JSON.parse(query.userInfo);

    Ride.find(
      { ownerUsername: userInfo.username, date: { $lt: new Date() } },
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
  } else if (type === "driveHistoryMore") {
    const userInfo = JSON.parse(query.userInfo);
    Ride.find(
      { ownerUsername: userInfo.username, date: { $lt: new Date() } },
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
  } else if (type === "driveUpcoming") {
    const userInfo = JSON.parse(query.userInfo);

    Ride.find(
      { ownerUsername: userInfo.username, date: { $gte: new Date() } },
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
  } else if (type === "rideHistory") {
    const userInfo = JSON.parse(query.userInfo);

    Ride.find(
      { passengers: userInfo.username, date: { $lt: new Date() } },
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
  } else if (type === "rideHistoryMyAccount") {
    const userInfo = JSON.parse(query.userInfo);

    Ride.find(
      { passengers: userInfo.username, date: { $lt: new Date() } },
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
  } else if (type === "rideUpcoming") {
    const userInfo = JSON.parse(query.userInfo);

    Ride.find(
      { passengers: userInfo.username, date: { $gte: new Date() } },
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
  } else if (type === "fetchHistoryTotal") {
    const userInfo = JSON.parse(query.userInfo);

    Ride.count({ passengers: userInfo.username }, (err1, rideHistoryTotal) => {
      if (err1) {
        callback(err1, null);
      } else {
        Ride.count(
          { ownerUsername: userInfo.username },
          (err2, driveHistoryTotal) => {
            if (err2) {
              callback(err2, null);
            } else {
              callback(null, [rideHistoryTotal, driveHistoryTotal]);
            }
          }
        );
      }
    });
  } else {
    Ride.find({ date: { $gte: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    })
      .sort({ date: 1 })
      .limit(10 * pageNum);
  }
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

const fetchMore = (multiplier, callback) => {
  Ride.find({}, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  })
    .sort({ _id: -1 })
    .skip(multiplier * 18)
    .limit(18);
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

const rideDelete = (id, callback) => {
  Ride.deleteOne({ _id: id }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const uploadPicUrl = (_id, picUrl, callback) => {
  User.findOneAndUpdate({ _id }, { picUrl }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const getPicUrl = (username, callback) => {
  User.find({ username }, (err, result) => {
    console.log(err)
    if (err) {
      callback(err, null);
    } else if(result.length === 0){
      callback("no result; potentially wrong username", null)
    }
    else {
      callback(null, result[0].picUrl);
    }
  });
};

const getNoti = (email, callback) => {
  Noti.find({ email }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  })
    .sort({ _id: -1 })
    .limit(8);
};

const updateNoti = (email, callback) => {
  Noti.updateMany({ email }, { $set: { viewed: true } }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  })
    .sort({ _id: -1 })
    .limit(8);
};

const emailValidation = (email, callback) => {
  User.find({ email }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const usernameValidation = (username, callback) => {
  User.find({ username }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const phoneNumberValidation = (phoneNumber, callback) => {
  User.find({ phoneNumber }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const checkAvailability = (email, username, phoneNumber, callback) => {
  User.find({ email, username, phoneNumber }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const login = (query, newToken, callback) => {
  if (query.type === "cookie") {
    const parsed = JSON.parse(query.authToken);
    User.find(
      {
        email: query.email,
        authToken: parsed.authToken
      },
      (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      }
    );
  } else if (query.type === "login") {
    User.findOneAndUpdate(
      {
        email: query.email,
        password: query.password
      },
      {
        authToken: newToken
      },
      {
        new: true
      },
      (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      }
    );
  }
};

const post = (userInfo, callback) => {
  const newUser = userInfo;
  newUser.posting_list = [];
  newUser.participate = [];
  User.create(newUser, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

module.exports = {
  post,
  checkAvailability,
  login,
  rideUpdate,
  emailValidation,
  usernameValidation,
  phoneNumberValidation,
  fetchMore,
  postRide,
  getRide,
  rideDelete,
  uploadPicUrl,
  getNoti,
  updateNoti,
  getPicUrl
};
