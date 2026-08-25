const express = require('express')
const router = express.Router()
const { apiLimiter } = require('./shared/middlewares')

router.use(apiLimiter)

router.get('/status', (req, res) => res.json({
    message: 'Backend Online',
    version: '1.0.0',
    environment: process.env.NODE_ENV
}))

const v1 = express.Router()
v1.use('/', require('./modules/auth/auth.routes'))
v1.use('/users', require('./modules/user/user.routes'))
v1.use('/workspaces', require('./modules/workspace/workspace.routes'))
v1.use('/boards', require('./modules/board/board.routes'))
v1.use('/columns', require('./modules/column/column.routes'))
v1.use('/item-updates', require('./modules/item-update/item-update.routes'))
v1.use('/comments', require('./modules/comment/comment.routes'))
v1.use('/notifications', require('./modules/notification/notification.routes'))
v1.use('/sections', require('./modules/section/section.routes'))
v1.use('/items', require('./modules/item/item.routes'))
v1.use('/undo-actions', require('./modules/undo/undo.routes'))

router.use('/v1', v1)

module.exports = router