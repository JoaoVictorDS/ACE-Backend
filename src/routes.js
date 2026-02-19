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
routes.patch('/users/:user_id', authMiddleware, UserController.update)
routes.delete('/users/:user_id', authMiddleware, adminMiddleware, UserController.delete)

// BOARD
routes.post('/boards', authMiddleware, BoardController.create)
routes.get('/boards', authMiddleware, BoardController.list)
routes.patch('/boards/:board_id', authMiddleware, BoardController.update)
routes.delete('/boards/:board_id', authMiddleware, BoardController.delete)
routes.patch('/boards/:board_id/move', authMiddleware, BoardController.move)

// SECTION
routes.post('/boards/:board_id/sections', authMiddleware, SectionController.create)
routes.get('/boards/:board_id/sections', authMiddleware, SectionController.list)
routes.patch('/sections/:section_id', authMiddleware, SectionController.update)
routes.delete('/sections/:section_id', authMiddleware, SectionController.delete)
routes.patch('/sections/:section_id/move', authMiddleware, SectionController.move)

// COLUMN
routes.post('/boards/:board_id/columns', authMiddleware, ColumnController.create)
routes.get('/boards/:board_id/columns', authMiddleware, ColumnController.list)
routes.patch('/columns/:column_id', authMiddleware, ColumnController.update)
routes.delete('/columns/:column_id', authMiddleware, ColumnController.delete)
routes.patch('/columns/:column_id/move', authMiddleware, ColumnController.move)

// ITEM
routes.post('/sections/:section_id/items', authMiddleware, ItemController.create)
routes.get('/boards/:board_id/items', authMiddleware, ItemController.list)
routes.patch('/items/:item_id', authMiddleware, ItemController.update)
routes.delete('/items/:item_id', authMiddleware, ItemController.delete)
routes.patch('/items/:item_id/move', authMiddleware, ItemController.move)

// COMMENT
routes.post('/items/:item_id/comments', authMiddleware, CommentController.create)
routes.get('/items/:item_id/comments', authMiddleware, CommentController.list)
routes.patch('/comments/:comment_id', authMiddleware, CommentController.update)
routes.delete('/comments/:comment_id', authMiddleware, CommentController.delete)

// BOARD_MEMBER
routes.post('/boards/:board_id/members', authMiddleware, BoardMemberController.upsert)
routes.get('/boards/:board_id/members', authMiddleware, BoardMemberController.list)
routes.delete('/boards/:board_id/members/:member_id', authMiddleware, BoardMemberController.remove)

//LOG
routes.get('/boards/:board_id/logs', authMiddleware, BoardController.getHistory)

routes.get('/status', (req, res) => {
    return res.json({ message: 'Backend Online', version: '1.0.0' })
})

module.exports = routes