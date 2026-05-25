const prisma = require('../config/prisma')

class BaseRepository {
    /**
     * @param {string} model - Nome do modelo Prisma (ex: 'user', 'notification')
     */
    constructor(model) {
        if (!model) {
            throw new Error('Model name é obrigatório para BaseRepository')
        }
        this.model = model
        this.prisma = prisma
    }

    /**
    * Obtém o client correto (transação ou prisma normal)
    * @param {object} tx - Cliente de transação (opcional)
    * @returns {object} Cliente Prisma
    */
    _getClient(tx) {
        return tx || this.prisma
    }

    /**
     * @param {number} id - ID do recurso
     * @param {object} options - Opções (select, include, etc)
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<object>} Recurso ou null
     */
    async findById(id, options = {}, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].findUnique({
            where: { id },
            ...options,
        })
    }

    /**
    * @param {object} where - Critério de busca
    * @param {object} options - Opções (select, include, orderBy, skip, take)
    * @param {object} tx - Cliente de transação (opcional) 
    * @returns {Promise<array>} Array de recursos
    */
    async findMany(where = {}, options = {}, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].findMany({
            where,
            ...options,
        })
    }

    /**
     * @param {object} where - Critério de busca
     * @param {object} options - Opções (select, include)
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<object>} Recurso ou null
     */
    async findOne(where, options = {}, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].findFirst({
            where,
            ...options,
        })
    }

    /**
     * @param {object} data - Dados para criar
     * @param {object} options - Opções (select, include)
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<object>} Recurso criado
     */
    async create(data, options = {}, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].create({
            data,
            ...options,
        })
    }

    /**
     * @param {array} data - Array de dados para criar
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<object>} Resultado da criação
     */
    async createMany(data, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].createMany({
            data,
        })
    }

    /**
     * @param {number} id - ID do recurso
     * @param {object} data - Dados para atualizar
     * @param {object} options - Opções (select, include)
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<object>} Recurso atualizado
     */
    async update(id, data, options = {}, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].update({
            where: { id },
            data,
            ...options,
        })
    }

    /**
    * @param {object} where - Critério para atualização
    * @param {object} data - Dados para atualizar
    * @param {object} tx - Cliente de transação (opcional)
    * @returns {Promise<object>} Recursos atualizados
    */
    async updateMany(where, data, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].updateMany({
            where,
            data,
        })
    }

    /**
     * @param {number} id - ID do recurso
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<object>} Recurso deletado
     */
    async delete(id, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].delete({
            where: { id },
        })
    }

    /**
     * @param {object} where - Critério de busca
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<number>} Total de registros
     */
    async count(where = {}, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].count({
            where,
        })
    }

    /**
    * @param {object} where - Critério para atualização/criação
    * @param {object} create - Dados para criar
    * @param {object} update - Dados para atualizar
    * @param {object} options - Opções (select, include)
    * @param {object} tx - Cliente de transação (opcional)
    * @returns {Promise<object>} Resultado da criação/atualização
    */
    async upsert(where, create, update, options = {}, tx = null) {
        const client = this._getClient(tx)
        return await client[this.model].upsert({
            where,
            create,
            update,
            ...options,
        })
    }

    /**
     * @param {object} where - Critério de busca
     * @param {number} page - Número da página (começa em 1)
     * @param {number} limit - Itens por página
     * @param {object} options - Opções (select, include, orderBy)
     * @returns {Promise<object>} { data, total, page, totalPages }
     */
    async paginate(where = {}, page = 1, limit = 20, options = {}) {
        const skip = (page - 1) * limit

        const [data, total] = await Promise.all([
            this.findMany(where, { skip, take: limit, ...options }),
            this.count(where),
        ])

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    }
}

module.exports = BaseRepository