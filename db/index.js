const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/bruinpool');

const db = mongoose.connection;

db.on('error', () => {
  console.log('mongoose connection error');
});

db.once('open', () => {
  console.log('mongoose connected successfully');
});

const userSchema = mongoose.Schema({
  email: String,
  username: String,
  password: String,
  phoneNumber: String,
  driverList: Array,
  riderList: Array,
  picUrl: String,
  authToken: String,
});

const listSchema = mongoose.Schema({
  ownerEmail: String,
  ownerUsername: String,
  ownerPhoneNumber: String,
  from: String,
  to: String,
  date: Date,
  price: String,
  seats: Number,
  detail: String,
  passengers: Array,
});

const notiSchema = mongoose.Schema({
  email: String,
  msg: String,
  passengerPhoneNumber: String,
  passengerEmail: String,
  viewed: Boolean,
});

const User = mongoose.model('User', userSchema);
const List = mongoose.model('List', listSchema);
const Noti = mongoose.model('Noti', notiSchema);

const getList = (query, type, pageNum, callback) => {
  if (type === 'rideFeed' && query.filter) {
    const filter = JSON.parse(query.filter);

    List.find({ from: filter.from, to: filter.to, date: { $gte: filter.date } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).limit(10 * pageNum);
  } else if (type === 'rideFeedMore' && query.filter) {
    const filter = JSON.parse(query.filter);

    List.find({ from: filter.from, to: filter.to, date: { $gte: filter.date } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).skip(pageNum * 10).limit(10);
  } else if (type === 'rideFeedMore' && !query.filter) {
    List.find({ date: { $gte: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).skip(pageNum * 10).limit(10);
  } else if (type === 'driveHistory') {
    const userInfo = JSON.parse(query.userInfo);

    List.find({ ownerUsername: userInfo.username, date: { $lt: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).limit(10 * pageNum);
  } else if (type === 'driveHistoryMyAccount') {
    const userInfo = JSON.parse(query.userInfo);

    List.find({ ownerUsername: userInfo.username, date: { $lt: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).skip(pageNum * 5).limit(5);
  } else if (type === 'driveHistoryMore') {
    const userInfo = JSON.parse(query.userInfo);
    List.find({ ownerUsername: userInfo.username, date: { $lt: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).skip(pageNum * 10).limit(10);
  } else if (type === 'driveUpcoming') {
    const userInfo = JSON.parse(query.userInfo);

    List.find({ ownerUsername: userInfo.username, date: { $gte: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).limit(3);
  } else if (type === 'rideHistory') {
    const userInfo = JSON.parse(query.userInfo);

    List.find({ passengers: userInfo.username, date: { $lt: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).limit(5);
  } else if (type === 'rideHistoryMyAccount') {
    const userInfo = JSON.parse(query.userInfo);

    List.find({ passengers: userInfo.username, date: { $lt: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).skip(pageNum * 5).limit(5);
  } else if (type === 'rideUpcoming') {
    const userInfo = JSON.parse(query.userInfo);

    List.find({ passengers: userInfo.username, date: { $gte: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).limit(3);
  } else if (type === 'fetchHistoryTotal') {
    const userInfo = JSON.parse(query.userInfo);

    List.count({ passengers: userInfo.username }, (err1, rideHistoryTotal) => {
      if (err1) {
        callback(err1, null);
      } else {
        List.count({ ownerUsername: userInfo.username }, (err2, driveHistoryTotal) => {
          if (err2) {
            callback(err2, null);
          } else {
            callback(null, [rideHistoryTotal, driveHistoryTotal]);
          }
        });
      }
    });
  } else {
    List.find({ date: { $gte: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }).sort({ date: 1 }).limit(10 * pageNum);
  }
};

const postRide = (rideInfo, callback) => {
  List.create(rideInfo, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const fetchMore = (multiplier, callback) => {
  List.find({}, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  }).sort({ _id: -1 }).skip(multiplier * 18).limit(18);
};

const rideUpdate = (upadatedRide, userInfo, status, callback) => {
  const noti = {
    email: upadatedRide.ownerEmail,
    msg: `${userInfo.username} has ${status}ed a ride`,
    passengerPhoneNumber: userInfo.phoneNumber,
    passengerEmail: userInfo.email,
    viewed: false,
  };

  List.findOneAndUpdate({ _id: upadatedRide._id, seats: { $gte: upadatedRide.passengers.length} }, upadatedRide, { new: true }, (err1, result1) => {
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
  });
};

const rideDelete = (id, callback) => {
  List.deleteOne({ _id: id }, (err, result) => {
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
    if (err) {
      callback(err, null);
    } else {
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
  }).sort({ _id: -1 }).limit(8);
};

const updateNoti = (email, callback) => {
  Noti.updateMany({ email }, { $set: { viewed: true } }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  }).sort({ _id: -1 }).limit(8);
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
  if (query.type === 'cookie') {
    const parsed = JSON.parse(query.authToken);
    User.find({
      email: parsed.email,
      authToken: parsed.authToken,
    }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    });
  } else if (query.type === 'login') {
    User.findOneAndUpdate({
      email: query.email,
      password: query.password,
    }, {
      authToken: newToken,
    }, {
      new: true,
    }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    });
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
  getList,
  rideDelete,
  uploadPicUrl,
  getNoti,
  updateNoti,
  getPicUrl,
};
