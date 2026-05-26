const { Server } = require('socket.io')
const AuthService = require('../modules/auth/auth.service')
const logger = require('./logger')

let io

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL,
            methods: ['GET', 'POST'],
            credentials: true
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
        logger.info({ userId }, 'Socket: usuario conectado')

        socket.on('board:join', (boardId) => {
            socket.join(`board:${boardId}`)
            logger.debug({ userId, boardId }, 'Socket: usuario entrou no board')
        })

        socket.on('board:leave', (boardId) => {
            socket.leave(`board:${boardId}`)
            logger.debug({ userId, boardId }, 'Socket: usuario saiu do board')
        })

        socket.on('disconnect', () => {
            logger.info({ userId }, 'Socket: usuario desconectado')
        })
    })

    return io
}

const getIO = () => {
    if (!io) throw new Error('Socket.io não foi inicializado!')
    return io
}

const emitToRoom = (room, event, payload) => {
    try {
        if (!io) throw new Error('Socket.io não inicializado')
        io.to(room).emit(event, payload)
    } catch (error) {
        logger.error({ error: error.message, room, event }, 'Falha ao emitir evento socket')
    }
}

module.exports = {
    initSocket,
    getIO,
    emitToRoom
}