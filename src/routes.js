const express = require('express')
const routes = express.Router()

const authMiddleware = require('./middlewares/authMiddleware')
const adminMiddleware = require('./middlewares/adminMiddleware')

const AuthController = require('./controllers/AuthController')
const UserController = require('./controllers/UserController')
const BoardController = require('./controllers/BoardController')
const SectionController = require('./controllers/SectionController')
const ColumnController = require('./controllers/ColumnController')
const ItemController = require('./controllers/ItemController')
const CommentController = require('./controllers/CommentController')
const BoardMemberController = require('./controllers/BoardMemberController')

// AUTH
routes.post('/login', AuthController.login)

// USER
routes.post('/users', authMiddleware, adminMiddleware, UserController.create)
routes.get('/users', authMiddleware, UserController.list)
routes.patch('/users/:userId', authMiddleware, UserController.update)
routes.delete('/users/:userId', authMiddleware, adminMiddleware, UserController.delete)

// BOARD
routes.post('/boards', authMiddleware, BoardController.create)
routes.get('/boards', authMiddleware, BoardController.list)
routes.patch('/boards/:boardId', authMiddleware, BoardController.update)
routes.delete('/boards/:boardId', authMiddleware, BoardController.delete)

// SECTION
routes.post('/boards/:boardId/sections', authMiddleware, SectionController.create)
routes.get('/boards/:boardId/sections', authMiddleware, SectionController.list)
routes.patch('/sections/:sectionId', authMiddleware, SectionController.update)
routes.delete('/sections/:sectionId', authMiddleware, SectionController.delete)
routes.patch('/sections/:sectionId/move', authMiddleware, SectionController.move)

// COLUMN
routes.post('/boards/:boardId/columns', authMiddleware, ColumnController.create)
routes.get('/boards/:boardId/columns', authMiddleware, ColumnController.list)
routes.patch('/columns/:columnId', authMiddleware, ColumnController.update)
routes.delete('/columns/:columnId', authMiddleware, ColumnController.delete)
routes.patch('/columns/:columnId/move', authMiddleware, ColumnController.move)

// ITEM
routes.post('/sections/:sectionId/items', authMiddleware, ItemController.create)
routes.get('/boards/:boardId/items', authMiddleware, ItemController.list)
routes.patch('/items/:itemId', authMiddleware, ItemController.update)
routes.delete('/items/:itemId', authMiddleware, ItemController.delete)
routes.patch('/items/:itemId/move', authMiddleware, ItemController.move)

// COMMENT
routes.post('/items/:itemId/comments', authMiddleware, CommentController.create)
routes.get('/items/:itemId/comments', authMiddleware, CommentController.list)
routes.delete('/comments/:commentId', authMiddleware, CommentController.delete)

// BOARD_MEMBER
routes.post('/boards/:boardId/members', authMiddleware, BoardMemberController.upsert)
routes.get('/boards/:boardId/members', authMiddleware, BoardMemberController.list)
routes.delete('/boards/:boardId/members/:memberId', authMiddleware, BoardMemberController.remove)

routes.get('/status', (req, res) => {
    return res.json({ message: 'Backend Online', version: '1.0.0' })
})

module.exports = routes