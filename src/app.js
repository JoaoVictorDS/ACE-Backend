require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')

const router = require('./router')
const { errorMiddleware } = require('./shared/middlewares')

const app = express()

const corsOptions = {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        }
    }
}))
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use('/api', router)
app.use(errorMiddleware)

module.exports = app