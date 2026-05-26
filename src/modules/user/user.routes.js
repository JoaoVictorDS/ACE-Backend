const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const adminMiddleware = require('../../shared/middlewares/admin.middleware')

const UserController = require('../../modules/user/user.controller')

router.post('/', authMiddleware, adminMiddleware, UserController.create)
router.get('/', authMiddleware, UserController.list)
router.patch('/:user_id', authMiddleware, UserController.update)
router.delete('/:user_id', authMiddleware, adminMiddleware, UserController.delete)

module.exports = router