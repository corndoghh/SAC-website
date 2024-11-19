const nm = require('nodemailer')
const fs = require("fs/promises")
const { JSDOM } = require("jsdom")
const { getUser, doesUserExist, getHashedToken, setUserValue, doesPropertyExist, addUserProperty } = require("./UserManager")
const EmailError = require("./Errors")
const UserError = require("./Errors")
const Crypto = require("crypto")


const transporter = nm.createTransport({
    port: 465,
    host: "mail.the-caretaker.org", 
    secure: true,
    auth: {
        user: "no-reply@expunged.eu",
        pass: "T5vMYxM2%ic7&m",
    },
    

});

transporter.verify((error, success) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
});

const sendMail = async (recipient, subject, htmlContent) => {
  const info = await transporter.sendMail({
      from: 'no-reply@expunged.eu',
      to: recipient,
      subject,
      html: htmlContent,
      envelope: {
          from: "No-Reply <no-reply@expunged.eu>",
          to: recipient,
      }
  });

  console.log(info.messageId)
}


module.exports.sendConfirmationEmail = async (recipient) => {
  if (!(await doesUserExist(recipient))) { throw new UserError("User does not exist") }

  const user = await getUser(recipient)

  const hashToken = await getHashedToken(recipient)

  const dom = new JSDOM(await fs.readFile(__dirname + '/../emails/confimation.html', "utf-8"))
  dom.window.document.getElementById("custom-name").innerHTML = `Hello, ${user["FirstName"]}`
  dom.window.document.getElementById("confirmation-URL").setAttribute("href", "http://localhost:3000/confirm?token="+hashToken+"&email="+user["Email"])
  dom.window.document.getElementById("unsubscribe-URL").setAttribute("href", "http://localhost:3000/unsubscribe?token="+hashToken+"&email="+user["Email"])

  await sendMail(user["Email"], "Newsletter Signup Confirmation", dom.window.document.documentElement.outerHTML)
}

module.exports.sendForgotPasswordEmail = async (recipient) => {
  if (!(await doesUserExist(recipient))) { throw new UserError("User does not exist") }

  const user = await getUser(recipient)

  const hashToken = await getHashedToken(recipient)
  const tempCode = crypto.randomUUID()

  if (!(await doesPropertyExist(user["Email"], "tempCode"))) { await addUserProperty(user["Email"], "tempCode") }

  await setUserValue(user["Email"], "tempCode", tempCode)

  const dom = new JSDOM(await fs.readFile(__dirname + '/../emails/forgot-password.html', "utf-8"))
  dom.window.document.getElementById("reset-URL").setAttribute("href", "http://localhost:3000/reset-password?token="+hashToken+"&email="+user["Email"]+"&tempCode="+tempCode)

  await sendMail(user["Email"], "Reset Password", dom.window.document.documentElement.outerHTML)
}