const { createServer } = require('http')
const app = require('./app')
const { initSocket, logger } = require('./config')
const EventRegistry = require('./shared/events/event.registry')

const httpServer = createServer(app)

initSocket(httpServer)

EventRegistry.register()

const PORT = process.env.PORT

httpServer.listen(PORT, () => {
    logger.info('Servidor iniciado na porta %d', PORT)
    logger.info('Socket.io habilitado na mesma porta')
})