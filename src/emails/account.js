const nodemailer = require('nodemailer')

const sendActivationEmail = (email = '', name = '', url = '') => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.ethereal.email',
    auth: {
      user: 'dvaramash@gmail.com',
      pass: process.env.GMAIL_PASSWORD,
    },
  })

  const mailOptions = {
    from: 'dvaramash@gmail.com',
    to: email,
    subject: 'Welcome to Apartment rental',
    html: `<h1>Apartment Rental</h1><br>
            <p>Hello ${name}, Thanks for joining Apartment Rental</p><br>
            <a href=${url}> Please activate your account </a>`,
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      throw new Error('Unable to send email.')
    }
  })
}

module.exports = {
  sendActivationEmail,
}
