const prisma = require('../config/prisma')

const SectionService = {
    async createSection({ boardId, name, ownerId }) {
        if (!boardId || !name || !ownerId) {
            throw new Error('ID do Quadro, Nome da Seção e ID do Proprietário são obrigatórios!')
        }

        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: { owner_id: true }
        })

        if (!board || board.owner_id !== ownerId) {
            throw new Error('Quadro não encontrado ou você não tem permissão para criar seções nele!')
        }

        const lastSection = await prisma.section.findFirst({
            where: { board_id: boardId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        const newOrder = lastSection ? lastSection.order + 1 : 0

        const newSection = await prisma.section.create({
            data: {
                board_id: boardId,
                name,
                order: newOrder,
            },
        })

        return newSection
    },

    async getSectionsByBoard(boardId) {
        if (!boardId) {
            throw new Error('ID do Quadro é obrigatório para listar seções!')
        }

        const sections = await prisma.section.findMany({
            where: {
                board_id: boardId,
            },
            orderBy: {
                order: 'asc',
            },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        })

        return sections
    }

}

module.exports = SectionService