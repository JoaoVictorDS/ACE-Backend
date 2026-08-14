const { Prisma } = require('@prisma/client')

const SOFT_DELETE_MODELS = ['workspace', 'board', 'section', 'column', 'item', 'comment', 'itemUpdate']
const SOFT_DELETE_OPERATIONS = ['findMany', 'findUnique', 'findFirst', 'count']

const _excludeDeleted = async ({ operation, args, query }) => {
    if (!SOFT_DELETE_OPERATIONS.includes(operation)) return query(args)

    const { includeDeleted, ...cleanArgs } = args ?? {}
    if (includeDeleted) return query(cleanArgs)

    cleanArgs.where = { deleted_at: null, ...cleanArgs.where }
    return query(cleanArgs)
}

const softDeleteExtension = Prisma.defineExtension({
    name: 'soft-delete',
    query: SOFT_DELETE_MODELS.reduce((handlers, model) => {
        handlers[model] = { $allOperations: _excludeDeleted }
        return handlers
    }, {}),
})

module.exports = softDeleteExtension