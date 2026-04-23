const { Server } = require('socket.io')
const AuthService = require('../services/AuthService')
const AppError = require('../utils/AppError')

let io

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // No futuro, colocar aqui a URL do Front-end
            methods: ["GET", "POST"]
        }
    })

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization
            const user = await AuthService.validateToken(token)

            socket.user = user

            next()
        } catch (error) {
            next(error)
        }
    })

    io.on('connection', (socket) => {
        const userId = socket.user.id;

        socket.join(`user:${userId}`)

        console.log(`⚡ Socket: Usuário ${userId} está conectado e ouvindo na sala user:${userId}`)

        socket.on('disconnect', () => {
            console.log(`🔌 Socket: Usuário ${userId} foi desconectado`)
        })
    })

    return io
}

const getIO = () => {
    if (!io) throw new Error('Socket.io não foi inicializado!')
    return io
}

module.exports = {
    initSocket,
    getIO
}