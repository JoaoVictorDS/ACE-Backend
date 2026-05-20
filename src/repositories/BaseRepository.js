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
     * @param {number} id - ID do recurso
     * @param {object} options - Opções (select, include, etc)
     * @returns {Promise<object>} Recurso ou null
     */
    async findById(id, options = {}) {
        return await this.prisma[this.model].findUnique({
            where: { id },
            ...options,
        })
    }

    /**
     * @param {object} where - Critério de busca
     * @param {object} options - Opções (select, include, orderBy, skip, take)
     * @returns {Promise<array>} Array de recursos
     */
    async findMany(where = {}, options = {}) {
        return await this.prisma[this.model].findMany({
            where,
            ...options,
        })
    }

    /**
     * @param {object} where - Critério de busca
     * @param {object} options - Opções (select, include)
     * @returns {Promise<object>} Recurso ou null
     */
    async findOne(where, options = {}) {
        return await this.prisma[this.model].findFirst({
            where,
            ...options,
        })
    }

    /**
     * @param {object} data - Dados para criar
     * @param {object} options - Opções (select, include)
     * @returns {Promise<object>} Recurso criado
     */
    async create(data, options = {}) {
        return await this.prisma[this.model].create({
            data,
            ...options,
        })
    }

    /**
     * @param {array} data - Array de dados para criar
     * @returns {Promise<object>} Resultado da criação
     */
    async createMany(data) {
        return await this.prisma[this.model].createMany({
            data,
        })
    }

    /**
     * @param {number} id - ID do recurso
     * @param {object} data - Dados para atualizar
     * @param {object} options - Opções (select, include)
     * @returns {Promise<object>} Recurso atualizado
     */
    async update(id, data, options = {}) {
        return await this.prisma[this.model].update({
            where: { id },
            data,
            ...options,
        })
    }

    /**
     * @param {number} id - ID do recurso
     * @returns {Promise<object>} Recurso deletado
     */
    async delete(id) {
        return await this.prisma[this.model].delete({
            where: { id },
        })
    }

    /**
     * @param {object} where - Critério de busca
     * @returns {Promise<number>} Total de registros
     */
    async count(where = {}) {
        return await this.prisma[this.model].count({
            where,
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
            this.prisma[this.model].findMany({
                where,
                skip,
                take: limit,
                ...options,
            }),
            this.prisma[this.model].count({ where }),
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