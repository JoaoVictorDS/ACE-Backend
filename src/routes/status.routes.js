const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
    return res.json({
        message: 'Backend Online',
        version: '1.0.0',
        environment: process.env.NODE_ENV
    })
})

module.exports = router