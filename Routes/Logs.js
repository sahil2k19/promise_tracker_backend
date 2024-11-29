const express = require('express');
const router = express.Router();
const LogSchema = require('../modules/LogSchema'); // Replace with your actual User model



router.get('/logs', async (req, res) => {
    try {
        const logs = await LogSchema.find()
                                        .populate('userId', 'name userRole')
                                        .populate('taskId', 'taskName')
                                        .sort({ timestamp: -1 });  
        return res.json(logs);
         
    } catch (error) {
        return res.status(500).json({ error: error.message});
    }
}) 

router.post('/logs', async(req,res)=>{
    const body = req.body;
    try {
        const log = await LogSchema.create(body);
        return res.json(log);
    } catch (error) {
        return res.status(500).json({ error: error.message});
    }
})

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


module.exports = router;
