const createLeafRestoreExecutor = require('./create-leaf-restore-executor')
const { ENTITY_TYPES } = require('../../../shared/constants')
const CommentRepository = require('../../comment/comment.repository')
const ItemUpdateRepository = require('../../item-update/item-update.repository')

const RESTORE_EXECUTORS = {
    [ENTITY_TYPES.COMMENT]: createLeafRestoreExecutor(CommentRepository, { entityLabel: 'Comentário' }),
    [ENTITY_TYPES.ITEM_UPDATE]: createLeafRestoreExecutor(ItemUpdateRepository, { entityLabel: 'Atualização de item' }),
}

module.exports = {
    RESTORE_EXECUTORS,
}