const { Server } = require('socket.io')
const AuthService = require('../modules/auth/auth.service')
const { AppError } = require('../shared/errors')
const logger = require('./logger')
const ERROR_CATALOG = require('../shared/errors/error-catalog')
const PermissionService = require('../shared/services/permission.service')
const { PERMISSION_LEVELS, RESOURCE_TYPES } = require('../shared/constants')

let io

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true
        }
    })

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token
            const user = await AuthService.validateToken(token)

            socket.user = user
            next()
        } catch (error) {
            next(error)
        }
    })

    io.on('connection', (socket) => {
        const userId = socket.user.id

        socket.join(`user:${userId}`)
        logger.info({ userId }, 'Socket: usuario conectado')

        socket.on('workspace:join', async (workspaceId) => {
            try {
                await PermissionService.checkWorkspace(Number(workspaceId), socket.user, PERMISSION_LEVELS.VIEW)
                socket.join(`workspace:${workspaceId}`)
                logger.debug({ userId, workspaceId }, 'Socket: usuario entrou no workspace')
            } catch (error) {
                logger.warn({ userId, workspaceId, error: error.message }, 'Socket: join negado')
            }
        })

        socket.on('workspace:leave', (workspaceId) => {
            socket.leave(`workspace:${workspaceId}`)
            logger.debug({ userId, workspaceId }, 'Socket: usuario saiu do workspace')
        })

        socket.on('board:join', async (boardId) => {
            try {
                await PermissionService.check(RESOURCE_TYPES.BOARD, Number(boardId), socket.user, PERMISSION_LEVELS.VIEW)
                socket.join(`board:${boardId}`)
                logger.debug({ userId, boardId }, 'Socket: usuario entrou no board')
            } catch (error) {
                logger.warn({ userId, boardId, error: error.message }, 'Socket: join negado')
            }
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
    if (!io) {
        throw new AppError(
            ERROR_CATALOG.INTERNAL.SOCKET_NOT_INITIALIZED.message,
            500,
            {
                code: ERROR_CATALOG.INTERNAL.SOCKET_NOT_INITIALIZED.code,
                isOperational: false
            }
        )
    }
    return io
}

const emitToRoom = (room, event, payload) => {
    try {
        if (!io) {
            throw new AppError(
                ERROR_CATALOG.INTERNAL.SOCKET_NOT_INITIALIZED.message,
                500,
                {
                    code: ERROR_CATALOG.INTERNAL.SOCKET_NOT_INITIALIZED.code,
                    isOperational: false
                }
            )
        }
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
