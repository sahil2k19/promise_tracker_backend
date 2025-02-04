const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');


// Create the transporter
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user:  process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_PASS // Your Gmail password or App Password
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

const sendMultipleEmails = async (recipients) => {
    const emailPromises = recipients.map(
        (recipient) =>
            new Promise((resolve, reject) => {
                sendMail(
                    recipient,
                    subject,
                    replacements,
                    emailTemplate,
                    (error, info) => {
                        if (error) return reject(error);
                        resolve(info);
                    }
                );
            })
    );

    try {
        const results = await Promise.all(emailPromises);
        console.log('All emails sent successfully:', results);
    } catch (err) {
        console.error('Failed to send some emails:', err);
    }
};


const sendDynamicEmails = (to, subject,htmlContent, cb)=>{

    let mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html: htmlContent,            // The HTML content
      };
    transporter.sendMail(mailOptions, (error, info) => {
        cb(error, info);
})

}


module.exports = {sendMail, sendMultipleEmails, sendDynamicEmails}