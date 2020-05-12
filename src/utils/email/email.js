const nodemailer = require("nodemailer");
const path = require("path");
const Email = require("email-templates");
const SENDGRID_USERNAME = process.env.SENDGRID_USERNAME;
const SENDGRID_PASSWORD = process.env.SENDGRID_PASSWORD;

// Send an email using SendGrid account
const sendEmail = async (mailOptions) => {
  return new Promise((resolve, reject) => {
    // Create the transporter with a SendGrid transporter
    const transporter = nodemailer.createTransport({
      service: "SendGrid",
      auth: {
        user: SENDGRID_USERNAME,
        pass: SENDGRID_PASSWORD,
      },
    });
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return reject(error);
      }
      return resolve("Message sent: " + info.response);
    });
  });
};

// Dynamically load an HTML email template with specified values
const loadTemplate = (templateName, context) => {
  return new Promise((resolve, reject) => {
    const template_dir = path.join(__dirname, "email_templates");
    let email = new Email({ views: { root: template_dir } });
    email
      .render(templateName, context)
      .then((emailTemplate) => {
        return resolve(emailTemplate);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

// Send a verification email
const sendVerificationEmail = async (email, verificationLink) => {
  return new Promise(async (resolve, reject) => {
    try {
      const emailContext = { verificationLink };
      const emailTemplate = await loadTemplate(
        "email_verification.hbs",
        emailContext
      );
      const mailOptions = {
        from: '"PoolUp" <no-reply@poolup.co>',
        to: email,
        subject: "[PoolUp] Please verify your PoolUp account",
        html: emailTemplate,
      };
      if (process.env.MODE === "TESTING") {
        return resolve();
      }
      return resolve(await sendEmail(mailOptions));
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  sendEmail,
  loadTemplate,
  sendVerificationEmail,
};
