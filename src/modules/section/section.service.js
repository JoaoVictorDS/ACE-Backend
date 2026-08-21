const { emitToRoom } = require('../../config')
const SectionRepository = require('./section.repository')
const { RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const { NotFoundError, ConflictError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { TransactionManager } = require('../../shared/database')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { EventPublisher } = require('../../shared/events')
const SectionCascadeService = require('./section-cascade.service')

const SectionService = {

    async create({ user, boardId, name }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        const result = await TransactionManager.run(async (tx) => {
            const order = await SectionRepository.findMaxOrder(boardId, tx)

            return await SectionRepository.create(boardId, name, order, tx)
        })

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            entityType: ENTITY_TYPES.SECTION,
            entityId: result.id,
            action: 'CREATE',
            resource: { workspaceId, boardId, section: { id: result.id, name: result.name } },
            changes: { before: null, after: result.name },
            snapshot: {
                before: null,
                after: {
                    id: result.id,
                    board_id: result.board_id,
                    name: result.name,
                    order: result.order,
                    deleted_at: null
                }
            }
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

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            entityType: ENTITY_TYPES.SECTION,
            entityId: updatedSection.id,
            action: 'UPDATE',
            resource: { workspaceId, boardId, section: { id: updatedSection.id, name: updatedSection.name } },
            changes: { before: section.name, after: updatedSection.name }
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

        const { cascaded, deletedSection } = await TransactionManager.run(async (tx) => {
            const timestamp = new Date()

            const cascaded = await SectionCascadeService.cascadeDelete(sectionId, timestamp, tx)

            const deletedSection = await SectionRepository.softDelete(sectionId, tx)

            await SectionRepository.decrementOrderAfter(boardId, sectionToDelete.order, tx)

            return { cascaded, deletedSection }
        })

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            entityType: ENTITY_TYPES.SECTION,
            entityId: sectionToDelete.id,
            action: 'DELETE',
            resource: { workspaceId, boardId, section: { id: sectionToDelete.id, name: sectionToDelete.name } },
            changes: { before: sectionToDelete.name, after: null },
            snapshot: {
                before: {
                    id: sectionToDelete.id,
                    board_id: sectionToDelete.board_id,
                    name: sectionToDelete.name,
                    order: sectionToDelete.order,
                    deleted_at: null
                },
                after: null,
                cascaded
            }
        })

        emitToRoom(`board:${boardId}`, 'section:deleted', { sectionId })

        return deletedSection
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

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            entityType: ENTITY_TYPES.SECTION,
            entityId: result.id,
            action: 'MOVE',
            resource: { workspaceId, boardId, section: { id: result.id, name: result.name } },
            changes: { before: currentSection.order, after: result.order }
        })

        emitToRoom(`board:${boardId}`, 'section:moved', result)

        return result
    },
}

module.exports = SectionService