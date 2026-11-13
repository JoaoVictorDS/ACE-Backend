const express = require('express')
const router = express.Router()

const { authMiddleware, adminMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { updateStatusSchema, updateUserStatusSchema, updateUserPeriodsSchema, upsertNotesSchema, upsertUserNotesSchema, getDaySchema, getAvailabilityHistorySchema } = require('./user-availability.validator')
const UserAvailabilityController = require('./user-availability.controller')

router.get('/', authMiddleware, UserAvailabilityController.list)
router.get('/:user_id/days/:work_date', authMiddleware, adminMiddleware, validationMiddleware(getDaySchema), UserAvailabilityController.showDay)
router.patch('/me/status', authMiddleware, validationMiddleware(updateStatusSchema), UserAvailabilityController.updateMe)
router.patch('/:user_id/status', authMiddleware, adminMiddleware, validationMiddleware(updateUserStatusSchema), UserAvailabilityController.update)
router.patch('/:user_id/days/:work_date/periods', authMiddleware, adminMiddleware, validationMiddleware(updateUserPeriodsSchema), UserAvailabilityController.updatePeriods)
router.patch('/me/notes', authMiddleware, validationMiddleware(upsertNotesSchema), UserAvailabilityController.upsertMe)
router.patch('/:user_id/days/:work_date/notes', authMiddleware, adminMiddleware, validationMiddleware(upsertUserNotesSchema), UserAvailabilityController.upsert)

router.get('/logs', authMiddleware, adminMiddleware, validationMiddleware(getAvailabilityHistorySchema), UserAvailabilityController.getHistory)

module.exports = router