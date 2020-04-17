const nodemailer = require('nodemailer');
const path = require('path');
const Email = require('email-templates');
const DEV_EMAIL = process.env.DEV_EMAIL; 
const DEV_PASSWORD = process.env.DEV_PASSWORD;

// Send an email using poolup.devs@gmail.com account 
const sendEmail = async (mailOptions) => {
  return new Promise((resolve, reject) => {
    // Create the transporter with the required configuration for Gmail
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
          user: DEV_EMAIL,
          pass: DEV_PASSWORD
      }
    });
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return reject(error)
      }
      return resolve("Message sent: " + info.response) 
    })
  })
}

// Dynamically load an HTML email template with specified values 
const loadTemplate = (templateName, context, callback) => {
  return new Promise((resolve, reject) => {
    const template_dir = path.join(__dirname, 'email_templates')
    let email = new Email({views: {root: template_dir}});
    email.render(templateName, context).then((emailTemplate) => {
      resolve(emailTemplate)
    })
    .catch((err) => {
      reject(err)
    })
  })
}

// Send a verification email 
const sendVerificationEmail = async (email, verificationLink) => {
  return new Promise(async (resolve, reject) => {
    try {
      const emailContext = {verificationLink}
      const emailTemplate = await loadTemplate('email_verification.hbs', emailContext)
      const mailOptions = {
        from: '"PoolUp" <poolup.devs@gmail.com>', 
        to: email, 
        subject: '[PoolUp] Please verify your PoolUp account', 
        html: emailTemplate
      }
      resolve(await sendEmail(mailOptions))
    }
    catch(e) {
      reject(e) 
    }
  })
}

module.exports = {
    sendEmail, 
    loadTemplate,
    sendVerificationEmail,
}