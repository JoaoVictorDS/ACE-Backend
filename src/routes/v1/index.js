const express = require('express')
const apiRouter = express.Router()

const authRoutes = require('./auth.routes')
const userRoutes = require('./user.routes')
const workspaceRoutes = require('./workspace.routes')
const boardRoutes = require('./board.routes')
const columnRoutes = require('./column.routes')
const commentRoutes = require('./comment.routes')
const notificationRoutes = require('./notification.routes')
const sectionRoutes = require('./section.routes')
const itemRoutes = require('./item.routes')

apiRouter.use('/', authRoutes)
apiRouter.use('/users', userRoutes)
apiRouter.use('/workspaces', workspaceRoutes)
apiRouter.use('/boards', boardRoutes)
apiRouter.use('/columns', columnRoutes)
apiRouter.use('/comments', commentRoutes)
apiRouter.use('/notifications', notificationRoutes)
apiRouter.use('/sections', sectionRoutes)
apiRouter.use('/items', itemRoutes)

module.exports = apiRouter