const express = require('express')
const router = express.Router()

const { authMiddleware, adminMiddleware } = require('../../middlewares')

const { UserController } = require('../../controllers')

router.post('/', authMiddleware, adminMiddleware, UserController.create)
router.get('/', authMiddleware, UserController.list)
router.patch('/:user_id', authMiddleware, UserController.update)
router.delete('/:user_id', authMiddleware, adminMiddleware, UserController.delete)

module.exports = router