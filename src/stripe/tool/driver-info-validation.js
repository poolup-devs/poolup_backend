const containsDriverInfo = driverInfo => {
  //driverInfo should have all its field populated
  if (
    driverInfo.licensePlate == "" ||
    driverInfo.vehicleMakeModel == "" ||
    driverInfo.driversLicense == "" ||
    driverInfo.vehicleColor == ""
  ) {
    return false;
  }

  // Check that the phoneNumber field in driverInfo matches the format of a phone number
  // NOTE: This does not validate or ensure it is a correct number that belongs the user.
  // TODO: Use a service like TWILIO to validate that the number belongs to the user.
  if (!validatePhoneNumber(driverInfo.phoneNumber)) {
    console.log("Driver Info string does not match format of phone number");
    return false;
  }

  return true;
};

// Check that the format matches that of a phone number
const validatePhoneNumber = phoneNumber => {
  var regex = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;
  if (phoneNumber.match(regex)) {
    return true;
  } else {
    return false;
  }
};

module.exports = {
  containsDriverInfo
};
