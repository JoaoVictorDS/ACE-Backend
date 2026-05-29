const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const adminMiddleware = require('../../shared/middlewares/admin.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const { createUserSchema, updateUserSchema, deleteUserSchema } = require('./user.validator')
const UserController = require('../../modules/user/user.controller')

router.post('/', authMiddleware, adminMiddleware, validationMiddleware(createUserSchema), UserController.create)
router.get('/', authMiddleware, UserController.list)
router.patch('/:user_id', authMiddleware, validationMiddleware(updateUserSchema), UserController.update)
router.delete('/:user_id', authMiddleware, adminMiddleware, validationMiddleware(deleteUserSchema), UserController.delete)

module.exports = router