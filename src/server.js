require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createServer } = require('http')

const routes = require('./routes')
const errorMiddleware = require('./middlewares/errorMiddleware')
const NotificationService = require('./services/NotificationService')
const { initSocket } = require('./config/socket')

const app = express()
const httpServer = createServer(app)

initSocket(httpServer)
NotificationService.init()

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

httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}/api/status`)
    console.log(`⚡ Socket.io habilitado e ouvindo na mesma porta!`)
})