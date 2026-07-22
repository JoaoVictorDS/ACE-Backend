const { emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const SectionRepository = require('./section.repository')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const { NotFoundError, ConflictError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { TransactionManager } = require('../../shared/database')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const SectionService = {

    async create({ user, boardId, name }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        const result = await TransactionManager.run(async (tx) => {
            const order = await SectionRepository.findMaxOrder(boardId, tx)

            return await SectionRepository.create(boardId, name, order, tx)
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'SECTION',
            entityId: result.id,
            newValue: { name }
        })

        emitToRoom(`board:${boardId}`, 'section:created', result)

        return result
    },

    async getByBoard({ user, boardId }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)

        return await SectionRepository.findByBoard(boardId)
    },

    async update({ user, sectionId, name }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.ADMIN)

        const section = await SectionRepository.findSectionName(sectionId)
        if (!section) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.SECTION)

        const isSameName = section.name === name
        if (isSameName) return section

        const updatedSection = await SectionRepository.update(sectionId, name)

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: { name: section.name },
            newValue: { name }
        })

        emitToRoom(`board:${boardId}`, 'section:updated', updatedSection)

        return updatedSection
    },

    async delete({ user, sectionId, force = false }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.ADMIN)

        const sectionToDelete = await SectionRepository.findSectionDeletionContext(sectionId)
        if (!sectionToDelete) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.SECTION)

        const { itemsCount } = sectionToDelete._count
        const hasContent = itemsCount > 0
        if (!force && hasContent) throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT('a seção', `${itemsCount} itens`))

        const result = await TransactionManager.run(async (tx) => {
            await SectionRepository.delete(sectionId, tx)

            return await SectionRepository.decrementOrderAfter(boardId, sectionToDelete.order, tx)
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: { name: sectionToDelete.name }
        })

        emitToRoom(`board:${boardId}`, 'section:deleted', { sectionId })

        return result
    },

    async move({ user, sectionId, newOrder }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.ADMIN)

        const currentSection = await SectionRepository.findById(sectionId)
        if (!currentSection) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.SECTION)
        const currentOrder = currentSection.order

        const totalSections = await SectionRepository.countByBoard(boardId)
        const finalOrder = Math.max(0, Math.min(newOrder, totalSections - 1))
        const isSamePosition = currentOrder === finalOrder
        if (isSamePosition) return currentSection

        const result = await TransactionManager.run(async (tx) => {
            if (finalOrder > currentOrder) {
                await SectionRepository.decrementOrderRange(boardId, currentOrder, finalOrder, tx)
            } else {
                await SectionRepository.incrementOrderRange(boardId, currentOrder, finalOrder, tx)
            }

            return await SectionRepository.updateOrder(sectionId, finalOrder, tx)
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'MOVE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: { order: currentOrder },
            newValue: { order: newOrder }
        })

        emitToRoom(`board:${boardId}`, 'section:moved', result)

        return result
    },
}

module.exports = SectionService