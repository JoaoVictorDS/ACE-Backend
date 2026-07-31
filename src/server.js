const { createServer } = require('http')
const app = require('./app')
const { initSocket, logger } = require('./config')
const NotificationService = require('./modules/notification/notification.service')
const LogService = require('./modules/log/log.service')
const MentionService = require('./modules/notification/mention.service')
const UndoService = require('./modules/undo/undo.service')

const httpServer = createServer(app)

initSocket(httpServer)

NotificationService.init()
LogService.init()
MentionService.init()
UndoService.init()

const PORT = process.env.PORT

httpServer.listen(PORT, () => {
    logger.info('Servidor iniciado na porta %d', PORT)
    logger.info('Socket.io habilitado na mesma porta')
})