const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config();

//  Configure Nodemailer to use Gmail
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // Use SSL for Gmail
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

//  Contact Form Route
router.post('/', async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone) {
        return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const mailOptions = {
        from: `"Reel Action Contact Form" <${process.env.SMTP_USER}>`, //Ensure sender matches your SMTP
        to: process.env.RECIPIENT_EMAIL, // Ensure this is correctly set
        replyTo: req.body.email, //Ensure replies go to the sender
        subject: "New Contact Form Submission",
        text: `New message from ${req.body.name}

    Email: ${req.body.email}
    Phone: ${req.body.phone}

    Message:
    ${req.body.message}`,
    };


    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Your message has been sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Failed to send email. Please try again later." });
    }
});

module.exports = router;
