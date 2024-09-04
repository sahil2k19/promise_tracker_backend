const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');


// Create the transporter
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user:  process.env.EMAIL_FROM, // Your Gmail address
        pass: process.env.EMAIL_APP_PASS // Your Gmail password or App Password
    }
});

const createHtmlContent = (templatePath, replacements) => {
    let template = fs.readFileSync(path.resolve(__dirname, templatePath), 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
        const placeholder = `{{${key}}}`;
        template = template.replace(new RegExp(placeholder, 'g'), value);
    }
    return template;
};

// Send an email
const sendMail = (to, subject, replacements,emailTemplate, cb) =>{
    console.log('replacements',replacements)
    console.log('emailTemplate',emailTemplate)
    const htmlContent = createHtmlContent(emailTemplate, replacements);
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html: htmlContent,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        cb(error, info);
    });
}


module.exports = {sendMail}