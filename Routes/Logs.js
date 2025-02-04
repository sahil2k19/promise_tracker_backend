const express = require('express');
const router = express.Router();
const LogSchema = require('../modules/LogSchema'); // Replace with your actual User model
const { sendMail, sendDynamicEmails } = require('../services/mail');
const moment = require('moment');
const User = require('../modules/UserSchema');


router.get('/logs', async (req, res) => {
    try {
        const logs = await LogSchema.find()
            .populate('userId', 'name userRole')
            .populate('taskId', 'taskName')
            .sort({ timestamp: -1 });
        return res.json(logs);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
})
router.post('/logs', async (req, res) => {
    const body = req.body;

    try {
        // Populate userId and taskId while creating the log
        const log = await LogSchema.create(body);

        // Fetch the populated log object
        const populatedLog = await LogSchema.findById(log._id)
            .populate('userId', 'name userRole email')  // Populating userId with name and userRole
            .populate({
                path: 'taskId',
                select: 'taskName owner',
            });  // Populating taskId with taskName
            console.log("populated log is ", populatedLog)
            const ownerDetails = await User.findOne({ _id: populatedLog.taskId.owner.id }, 'name email');
            console.log("ownerDetails", ownerDetails)
        // sending email
        sendMailFunction(populatedLog , ownerDetails);

        return res.json(populatedLog);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


router.get('/logs/:taskId', async (req, res) => {
    const { taskId } = req.params;

    try {
        const logs = await LogSchema.find({ taskId })
            .populate('userId', 'name userRole')
            .populate('taskId', 'taskName')
            .sort({ timestamp: -1 });  // Sort by createdAt in descending order

        return res.json(logs);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


const sendMailFunction = (log, ownerDetails) => {
    const time  = moment(log?.timestamp).format('Do MMMM [at] hh:mm A')
    // const email = "sahilgagan227@gmail.com";
    const email = ownerDetails?.email;
    console.log("ownder is ", ownerDetails)
    const emailTemplate = `../Email_Templates/logs_templates/${log?.action}.html`;
    const subject = email_subject_suffix[log?.action] + log?.taskId?.taskName;

    // sendMail(email, subject, replacements, emailTemplate, (error, info) => {
    //     if (error) {
    //         console.log(error);
    //     } else {
    //         console.log('Email sent: ' + info.response);
    //     }
    // });
    let emailHtml = `
            <!DOCTYPE html>
            <html lang="en">

            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Edit Logs</title>
                <style>
                    /* General styles */
                    body {
                        font-family: 'Arial', sans-serif;
                        background-color: #f7fafc;
                        margin: 0;
                        padding: 0;
                    }

                    /* Card container */
                    .card {
                        background-color: #fff;
                        padding: 2rem;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        max-width: 600px;
                        width: 100%;
                        margin: 20px auto;
                    }

                    /* Heading style */
                    .log-title {
                        font-size: 1.25rem;
                        margin-bottom: 1rem;
                        color: #4a5568;
                        font-weight: 500;
                    }

                    /* Text styles */
                    .log-details {
                        color: #4a5568;
                        font-size: 1rem;
                        line-height: 1.6;
                    }

                    .log-name {
                        font-weight: bold;
                        color: #3182ce;
                        text-transform: capitalize;
                    }

                    .log-task {
                        font-weight: bold;
                        color: #ed8936;
                        text-transform: capitalize;
                    }

                    .log-time {
                        color: #718096;
                        font-style: italic;
                    }

                    /* Log changes container */
                    .log-change {
                        padding: 1rem;
                        background-color: #e9d8fd;
                        border-radius: 8px;
                        margin-bottom: 16px;
                    }

                    .log-change-text {
                        color: #4a5568;
                        font-size: 1rem;
                        margin: 8px 0;
                    }

                    .log-change-text .log-name {
                        color: #2b6cb0;
                    }

                    .log-change-text .log-task {
                        color: #38a169;
                    }

                    .log-change-text .log-time {
                        font-style: italic;
                        color: #718096;
                    }

                    .log-change hr {
                        margin-top: 12px;
                        border: 1px solid #e2e8f0;
                    }

                    .highlight {
                        background-color: #bee3f8;
                        color: #3182ce;
                    }

                    .highlight-warning {
                        background-color: #feb2b2;
                        color: #e53e3e;
                    }
                </style>
            </head>

            <body>
                <div class="card">
                    <!-- Task Name Change -->
                    ${log?.details?.changes?.taskName ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> updated Task Name from <span className='font-bold text-orange-500'>${log?.details?.changes?.taskName?.oldValue}</span> to
                                <span class="log-task">"${log?.details?.changes?.taskName}"</span> on ${time}
                            </div>
                            
                        </div>
                    ` : ''}

                    <!-- Description Change -->
                    ${log?.details?.changes?.description ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> updated Description to
                                <span class="log-task">${log?.details?.changes?.description}</span> on ${time}
                            </div>
                            
                        </div>
                    ` : ''}

                    <!-- Audio File Change -->
                    ${log?.details?.changes?.audioFile ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> updated Audio File Status to
                                <span class="log-task">${log?.details?.changes?.audioFile?.status}</span> on ${time}
                            </div>
                            
                        </div>
                    ` : ''}

                    <!-- Start Date Change -->
                    ${log?.details?.changes?.startDate ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> changed Start Date to
                                <span class="log-task">${log?.details?.changes?.startDate}</span> on ${time}
                            </div>
                            
                        </div>
                    ` : ''}

                    <!-- End Date Change -->
                    ${log?.details?.changes?.endDate ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> changed End Date to
                                <span class="log-task">${log?.details?.changes?.endDate}</span> on ${time}
                            </div>
                            
                        </div>
                    ` : ''}

                    <!-- People Added -->
                    ${log?.details?.changes?.people?.added ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> added
                                ${log?.details?.changes?.people?.added.map(person => `
                                    <span class="highlight">${person.name}</span>
                                `).join(', ')}
                                to task on ${time}
                            </div>
                            
                        </div>
                    ` : ''}

                    <!-- People Removed -->
                    ${log?.details?.changes?.people?.removed ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> removed
                                ${log?.details?.changes?.people?.removed.map(person => `
                                    <span class="highlight-warning">${person.name}</span>
                                `).join(', ')}
                                from task on ${time}
                            </div>
                            
                        </div>
                    ` : ''}

                    <!-- PDF File Change -->
                    ${log?.details?.changes?.pdfFile ? `
                        <div class="log-change">
                            <div class="log-change-text">
                                <span class="log-name">"${log?.userId?.name}"</span> updated PDF File Status to
                                <span class="log-task">${log?.details?.changes?.pdfFile?.status}</span> on ${time}
                            </div>
                            
                        </div>
                    ` : ''}
                </div>
            </body>

            </html>
            `;
    if(log.action==="edit"){
        sendDynamicEmails(email, subject,  emailHtml, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
}


const email_subject_suffix = {
    "create": "Created Task: ",
    "edit": "Edited Task: ",
}








module.exports = router;
