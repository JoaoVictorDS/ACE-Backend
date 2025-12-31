const prisma = require('../config/prisma')

const BoardContextService = {

    async getBoardId(entityId, type) {
        if (!entityId) throw new Error('ID da Entidade não foi fornecido!')

        const id = parseInt(entityId)

        switch (type.toUpperCase()) {
            case 'BOARD':
                return id

            case 'SECTION':
                const section = await prisma.section.findUnique({
                    where: { id },
                    select: { board_id: true }
                })
                if (!section) throw new Error('Seção não encontrada!')
                return section.board_id

            case 'ITEM':
                const item = await prisma.item.findUnique({
                    where: { id },
                    select: { section: { select: { board_id: true } } }
                })
                if (!item) throw new Error('Tarefa não encontrada!')
                return item.section.board_id

            case 'COLUMN':
                const column = await prisma.column.findUnique({
                    where: { id },
                    select: { board_id: true }
                })
                if (!column) throw new Error('Coluna não encontrada!')
                return column.board_id

            default:
                throw new Error(`Tipo de referência '${type}' desconhecida!`)
        }
    }

}

module.exports = BoardContextService