const express = require('express')
const apiRouter = express.Router()

const authMiddleware = require('./middlewares/authMiddleware')
const adminMiddleware = require('./middlewares/adminMiddleware')

const AuthController = require('./controllers/AuthController')
const UserController = require('./controllers/UserController')
const WorkspaceController = require('./controllers/WorkspaceController')
const BoardController = require('./controllers/BoardController')
const SectionController = require('./controllers/SectionController')
const ColumnController = require('./controllers/ColumnController')
const ItemController = require('./controllers/ItemController')
const CommentController = require('./controllers/CommentController')
const BoardMemberController = require('./controllers/BoardMemberController')
const WorkspaceMemberController = require('./controllers/WorkspaceMemberController')
const NotificationController = require('./controllers/NotificationController')

// AUTH
apiRouter.post('/login', AuthController.login)

// USER
apiRouter.post('/users', authMiddleware, adminMiddleware, UserController.create)
apiRouter.get('/users', authMiddleware, UserController.list)
apiRouter.patch('/users/:user_id', authMiddleware, UserController.update)
apiRouter.delete('/users/:user_id', authMiddleware, adminMiddleware, UserController.delete)

// WORKSPACE
apiRouter.post('/workspaces', authMiddleware, adminMiddleware, WorkspaceController.create)
apiRouter.get('/workspaces', authMiddleware, WorkspaceController.list)
apiRouter.patch('/workspaces/:workspace_id', authMiddleware, WorkspaceController.update)
apiRouter.delete('/workspaces/:workspace_id', authMiddleware, adminMiddleware, WorkspaceController.delete)
apiRouter.patch('/workspaces/:workspace_id/move', authMiddleware, WorkspaceController.move)

// BOARD
apiRouter.post('/workspaces/:workspace_id/boards', authMiddleware, BoardController.create)
apiRouter.get('/boards', authMiddleware, BoardController.list)
apiRouter.patch('/boards/:board_id', authMiddleware, BoardController.update)
apiRouter.delete('/boards/:board_id', authMiddleware, BoardController.delete)
apiRouter.patch('/boards/:board_id/move', authMiddleware, BoardController.move)

// SECTION
apiRouter.post('/boards/:board_id/sections', authMiddleware, SectionController.create)
apiRouter.get('/boards/:board_id/sections', authMiddleware, SectionController.list)
apiRouter.patch('/sections/:section_id', authMiddleware, SectionController.update)
apiRouter.delete('/sections/:section_id', authMiddleware, SectionController.delete)
apiRouter.patch('/sections/:section_id/move', authMiddleware, SectionController.move)

// COLUMN
apiRouter.post('/boards/:board_id/columns', authMiddleware, ColumnController.create)
apiRouter.get('/boards/:board_id/columns', authMiddleware, ColumnController.list)
apiRouter.patch('/columns/:column_id', authMiddleware, ColumnController.update)
apiRouter.delete('/columns/:column_id', authMiddleware, ColumnController.delete)
apiRouter.patch('/columns/:column_id/move', authMiddleware, ColumnController.move)

// ITEM
apiRouter.post('/sections/:section_id/items', authMiddleware, ItemController.create)
apiRouter.get('/boards/:board_id/items', authMiddleware, ItemController.list)
apiRouter.patch('/items/:item_id', authMiddleware, ItemController.update)
apiRouter.delete('/items/:item_id', authMiddleware, ItemController.delete)
apiRouter.patch('/items/:item_id/move', authMiddleware, ItemController.move)

// COMMENT
apiRouter.post('/items/:item_id/comments', authMiddleware, CommentController.create)
apiRouter.get('/items/:item_id/comments', authMiddleware, CommentController.list)
apiRouter.patch('/comments/:comment_id', authMiddleware, CommentController.update)
apiRouter.delete('/comments/:comment_id', authMiddleware, CommentController.delete)

// WORKSPACE_MEMBER
apiRouter.post('/workspaces/:workspace_id/members', authMiddleware, WorkspaceMemberController.upsert)
apiRouter.get('/workspaces/:workspace_id/members', authMiddleware, WorkspaceMemberController.list)
apiRouter.delete('/workspaces/:workspace_id/members/:member_id', authMiddleware, WorkspaceMemberController.remove)
apiRouter.delete('/workspaces/:workspace_id/members', authMiddleware, WorkspaceMemberController.leave)

// BOARD_MEMBER
apiRouter.post('/boards/:board_id/members', authMiddleware, BoardMemberController.upsert)
apiRouter.get('/boards/:board_id/members', authMiddleware, BoardMemberController.list)
apiRouter.delete('/boards/:board_id/members/:member_id', authMiddleware, BoardMemberController.remove)
apiRouter.delete('/boards/board_id/members', authMiddleware, BoardMemberController.leave)

// LOG
apiRouter.get('/boards/:board_id/logs', authMiddleware, BoardController.getHistory)
apiRouter.get('/workspaces/:workspace_id/logs', authMiddleware, WorkspaceController.getHistory)

// NOTIFICATION
apiRouter.get('/notifications', authMiddleware, NotificationController.list)
apiRouter.patch('/notifications/:notification_id', authMiddleware, NotificationController.markAsRead)

const rootRouter = express.Router()

rootRouter.get('/status', (req, res) => {
    return res.json({
        message: 'Backend Online',
        version: '1.0.0',
        environment: process.env.NODE_ENV
    })
})

rootRouter.use('/v1', apiRouter)

module.exports = rootRouter