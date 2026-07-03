const ColumnRepository = require('./column.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const { ValidationError } = require('../../shared/errors')
const { splitIdList } = require('../../shared/utils')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

class ColumnValueValidator {

    /**
     * Verifica se valor é vazio
     * @private
     * @param {*} val
     * @returns {boolean}
     */
    static _isEmpty(val) {
        return (
            val === null ||
            val === undefined ||
            (Array.isArray(val) && val.length === 0) ||
            String(val).trim() === '' ||
            val === 'null' ||
            val === '[]'
        )
    }

    /**
     * Valida e normaliza valor conforme tipo de coluna
     * @param {object} column - Coluna com { data_type, options, board_id }
     * @param {*} value - Valor a validar
     * @returns {Promise<string>} Valor normalizado
     * @throws {ValidationError} Se valor inválido
     */
    static async validate(column, value) {
        if (this._isEmpty(value)) {
            return ''
        }

        const sentValue = String(value).trim()

        switch (column.data_type) {
            case 'TEXT':
            case 'URL':
            case 'TEXTAREA':
                return sentValue

            case 'SELECT':
                return this._validateSelect(column, sentValue)

            case 'NUMBER':
                return this._validateNumber(sentValue, column.name)

            case 'DATE':
                return this._validateDate(sentValue, column.name)

            case 'CHECKBOX':
                return this._validateCheckbox(sentValue)

            case 'USER':
                return this._validateUser(value, column.name, column.board_id)

            case 'FORMULA':
                return sentValue

            default:
                return sentValue
        }
    }

    /**
     * Valida valor SELECT
     * @private
     * @param {object} column
     * @param {string} sentValue
     * @returns {string}
     * @throws {ValidationError}
     */
    static _validateSelect(column, sentValue) {
        const allowedOptions = column.options || []

        if (!allowedOptions.includes(sentValue)) {
            throw new ValidationError(ERROR_CATALOG.VALIDATION.INVALID_COLUMN_VALUE(
                column.name,
                `deve ser uma das opções válidas: ${allowedOptions.join(', ')}`
            ))
        }

        return sentValue
    }

    /**
     * Valida valor NUMBER
     * @private
     * @param {string} sentValue
     * @param {string} columnName
     * @returns {string}
     * @throws {ValidationError}
     */
    static _validateNumber(sentValue, columnName) {
        const parsedNum = parseFloat(sentValue)

        if (isNaN(parsedNum) || !Number.isFinite(parsedNum)) {
            throw new ValidationError(ERROR_CATALOG.VALIDATION.INVALID_COLUMN_VALUE(
                columnName,
                'deve ser um número válido'
            ))
        }

        return String(parsedNum)
    }

    /**
     * Valida valor DATE
     * @private
     * @param {string} sentValue
     * @param {string} columnName
     * @returns {string}
     * @throws {ValidationError}
     */
    static _validateDate(sentValue, columnName) {
        const date = new Date(sentValue)

        if (isNaN(date.getTime())) {
            throw new ValidationError(ERROR_CATALOG.VALIDATION.INVALID_COLUMN_VALUE(
                columnName,
                'deve ser uma data válida'
            ))
        }

        return date.toISOString()
    }

    /**
     * Valida valor CHECKBOX
     * @private
     * @param {string} sentValue
     * @returns {string}
     */
    static _validateCheckbox(sentValue) {
        const boolValue = sentValue.toLowerCase() === 'true' || sentValue === '1'
        return boolValue ? 'true' : 'false'
    }

    /**
     * Valida valor USER (pode ser array ou string com IDs) e confere membership
     * @private
     * @param {*} value
     * @param {string} columnName
     * @param {number} boardId
     * @returns {Promise<string>}
     * @throws {ValidationError}
     */
    static async _validateUser(value, columnName, boardId) {
        const rawIds = splitIdList(value)

        const numericIds = rawIds.map(id => {
            const parsed = Number(id)

            if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
                throw new ValidationError(ERROR_CATALOG.VALIDATION.INVALID_COLUMN_VALUE(
                    columnName,
                    `contém um ID de usuário inválido: "${id}"`
                ))
            }

            return parsed
        })

        // Remove duplicatas e ordena
        const cleanIds = [...new Set(numericIds)].sort((a, b) => a - b)

        if (cleanIds.length === 0) {
            throw new ValidationError(ERROR_CATALOG.VALIDATION.INVALID_COLUMN_VALUE(
                columnName,
                'requer ao menos um usuário válido'
            ))
        }

        await this.validateUserMembership(boardId, cleanIds, columnName)

        return cleanIds.join(', ')
    }

    /**
     * Valida se usuários são membros do quadro
     * @param {number} boardId
     * @param {array} userIds
     * @param {string} columnName
     * @returns {Promise<boolean>}
     * @throws {ValidationError}
     */
    static async validateUserMembership(boardId, userIds, columnName) {
        const validMembersCount = await BoardMemberRepository.countValidMembers(boardId, userIds)

        if (validMembersCount !== userIds.length) {
            throw new ValidationError(ERROR_CATALOG.VALIDATION.INVALID_COLUMN_VALUE(
                columnName,
                'deve referenciar apenas usuários que são membros deste quadro'
            ))
        }

        return true
    }
}

module.exports = ColumnValueValidator