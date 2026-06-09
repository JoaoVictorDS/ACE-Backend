const ColumnRepository = require('./column.repository')
const { AppError } = require('../../shared/errors')

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
     * @param {object} column - Coluna com { data_type, options }
     * @param {*} value - Valor a validar
     * @returns {string} Valor normalizado
     * @throws {AppError} Se valor inválido
     */
    static validate(column, value) {
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
                return this._validateUser(value)

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
     * @throws {AppError}
     */
    static _validateSelect(column, sentValue) {
        const allowedOptions = column.options || []

        if (!allowedOptions.includes(sentValue)) {
            throw new AppError(
                `O valor "${sentValue}" não é permitido para "${column.name}". Opções válidas: ${allowedOptions.join(', ')}`,
                400
            )
        }

        return sentValue
    }

    /**
     * Valida valor NUMBER
     * @private
     * @param {string} sentValue
     * @param {string} columnName
     * @returns {string}
     * @throws {AppError}
     */
    static _validateNumber(sentValue, columnName) {
        const parsedNum = parseFloat(sentValue)

        if (isNaN(parsedNum) || !Number.isFinite(parsedNum)) {
            throw new AppError(
                `O valor "${sentValue}" não é permitido para a coluna "${columnName}". Opções válidas: Number`,
                400
            )
        }

        return String(parsedNum)
    }

    /**
     * Valida valor DATE
     * @private
     * @param {string} sentValue
     * @param {string} columnName
     * @returns {string}
     * @throws {AppError}
     */
    static _validateDate(sentValue, columnName) {
        const date = new Date(sentValue)

        if (isNaN(date.getTime())) {
            throw new AppError(
                `O valor "${sentValue}" não é permitido para a coluna "${columnName}". Opções válidas: Date`,
                400
            )
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
     * Valida valor USER (pode ser array ou string com IDs)
     * @private
     * @param {*} value
     * @returns {string}
     * @throws {AppError}
     */
    static _validateUser(value) {
        const rawIds = Array.isArray(value) ? value : String(value).split(',')

        const numericIds = rawIds.map(id => {
            const parsed = Number(String(id).trim())

            if (isNaN(parsed) || parsed <= 0) {
                throw new AppError(
                    `O valor "${id}" não é um ID de usuário válido.`,
                    400
                )
            }

            return parsed
        })

        // Remove duplicatas e ordena
        const cleanIds = [...new Set(numericIds)].sort((a, b) => a - b)

        if (cleanIds.length === 0) {
            throw new AppError('Nenhum usuário válido foi enviado.', 400)
        }

        return cleanIds.join(', ')
    }

    /**
     * Valida se usuários são membros do quadro
     * @param {number} boardId
     * @param {array} userIds
     * @returns {Promise<boolean>}
     * @throws {AppError}
     */
    static async validateUserMembership(boardId, userIds) {
        const validMembersCount = await ColumnRepository.countValidMembers(boardId, userIds)

        if (validMembersCount !== userIds.length) {
            throw new AppError(
                'Um ou mais usuários não pertencem ao quadro.',
                400
            )
        }

        return true
    }
}

module.exports = ColumnValueValidator