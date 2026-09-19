import nodemailer from "nodemailer"
import config from "../config";

// Create a transporter using SMTP
// export const sentEmail = nodemailer.createTransport({
//   host: "smtp.example.com",
//   port: 587,
//   secure: false, 
//   auth: {
//     user: config.smtp_user,
//     pass: config.smtp_pass,
//   },
// });


export const sentEmail  = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.smtp_user,
    pass: config.smtp_pass,
  },
});