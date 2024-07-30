const express = require('express');
const router = express.Router();
const LogSchema = require('../modules/LogSchema'); // Replace with your actual User model



router.get('/logs', async (req, res) => {
    try {
        const logs = await LogSchema.find();
        res.json(logs);
        return 
    } catch (error) {
        return res.status(500).json({ error: error.message});
    }
})

router.post('/logs', async(req,res)=>{
    const body = req.body;
    try {
        const log = await LogSchema.create(body);
        res.json(log);
    } catch (error) {
        return res.status(500).json({ error: error.message});
    }
})

module.exports = router;
