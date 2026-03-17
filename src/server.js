require('dotenv').config()
const express = require('express')
const cors = require('cors')
const errorMiddleware = require('./middlewares/errorMiddleware')
const routes = require('./routes')

const app = express()

const corsOptions = {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}

app.use(cors(corsOptions))
app.use(express.json())
app.use('/api', routes)
app.use(errorMiddleware)

const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}/api/status`)
})