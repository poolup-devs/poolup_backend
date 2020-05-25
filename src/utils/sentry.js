const Sentry = require("@sentry/node");

const { MODE, SENTRY_DSN } = process.env;

Sentry.init({
  dsn: SENTRY_DSN,
  debug: MODE === "STAGING",
  release: "pool-up@1.0.1",
});

// myUndefinedFunction();
// Sentry.captureException(new Error("Something broke"));

module.exports = Sentry;
