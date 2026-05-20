const { Server } = require('socket.io')
const AuthService = require('../services/AuthService')

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
        console.log(`⚡ Socket: Usuário ${userId} está conectado e ouvindo na sala user:${userId}`)

        socket.on('board:join', (boardId) => {
            socket.join(`board:${boardId}`)
            console.log(`👀 Usuário ${userId} abriu o quadro ${boardId}`)
        })

        socket.on('board:leave', (boardId) => {
            socket.leave(`board:${boardId}`)
            console.log(`👋 Usuário ${userId} fechou o quadro ${boardId}`)
        })

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

const emitToRoom = (room, event, payload) => {
    try {
        if (!io) throw new Error('Socket.io não inicializado')
        io.to(room).emit(event, payload)
    } catch (error) {
        console.error(`⚠️ Erro ao emitir socket para [${room}] no evento [${event}]:`, error.message)
    }
}

module.exports = {
    initSocket,
    getIO,
    emitToRoom
}