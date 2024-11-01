const nm = require('nodemailer')

const transporter = nm.createTransport({
    port: 465,
    host: "mail.the-caretaker.org", 
    secure: true,
    auth: {
        user: "no-reply@expunged.eu",
        pass: "T5vMYxM2%ic7&m",
    },
    

});

transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
});


