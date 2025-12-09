const prisma = require('../config/prisma')

const ALLOWED_DATA_TYPES = ['TEXT', 'LONG_TEXT', 'SELECT', 'USER', 'DATE', 'NUMBER', 'FORMULA']

const ColumnService = {
    async createColumn({ boardId, name, dataType, options, formulaExpression }) {
        if (!boardId || !name || !dataType) {
            throw new Error('Id do Quadro, Nome e Tipo de Dado são obrigatórios!')
        }

        if (!ALLOWED_DATA_TYPES.includes(dataType.toUpperCase())) {
            throw new Error(`Tipo de dado inválido: ${dataType}. Tipos permitido: ${ALLOWED_DATA_TYPES.join(', ')}`)
        }

        const isFormula = dataType.toUpperCase() === 'FORMULA'

        if (isFormula && (!formulaExpression || formulaExpression.trim() === '')) {
            throw new Error('O tipo FORMULA exige uma expressão de cálculo (formulaExpression)!')
        }

        if (dataType.toUpperCase() === 'SELECT' && (!options || !Array.isArray(options) || options.length === 0)) {
            throw new Error('O tipo SELECT exige um array de opções válidas!')
        }

        const newColumn = await prisma.column.create({
            data: {
                board_id: boardId,
                name,
                data_type: dataType.toUpperCase(),
                formula_expression: isFormula ? formulaExpression : null,
                options: dataType.toUpperCase() === 'SELECT' ? options : null,
            },
        })

        return newColumn
    },

    async getColumnsByBoard(boardId) {
        if (!boardId) {
            throw new Error('ID do Quadro é obrigatório para listar colunas!')
        }

        const column = await prisma.column.findMany({
            where: {
                board_id: boardId,
            },
            orderBy: {
                id: 'asc',
            }
        })

        return column
    },

    async verifyBoardOwnership(columnId, ownerId) {
        const column = await prisma.column.findUnique({
            where: { id: columnId },
            include: {
                board: {
                    select: { owner_id: true }
                }
            }
        })

        if (!column) {
            throw new Error('Coluna não encontrada!')
        }

        if (column.board.owner_id !== ownerId) {
            throw new Error('Você não tem permissão para editar/deletar esta coluna!')
        }

        return column
    },

    async updateColumn({ columnId, ownerId, name, dataType, options, formulaExpression }) {
        if (!columnId || !ownerId) {
            throw new Error('ID da Coluna e ID do Proprietário são obrigatórios!');
        }

        await this.verifyBoardOwnership(columnId, ownerId)

        const updatedColumn = await prisma.column.update({
            where: { id: columnId },
            data: {
                ...(name && { name }),
                ...(dataType !== undefined && { data_type: dataType }),
                ...(options !== undefined && { options }),
                ...(formulaExpression !== undefined && { formula_expression: formulaExpression }),
            }
        })

        return updatedColumn
    },

    async deleteColumn({ columnId, ownerId }) {
        if (!columnId || !ownerId) {
            throw new Error('ID da Coluna e ID do Proprietário são obrigatórios!')
        }

        await this.verifyBoardOwnership(columnId, ownerId)

        await prisma.column.delete({
            where: { id: columnId }
        })

        return { message: 'Coluna excluída com sucesso!' };

    }

}

module.exports = ColumnService