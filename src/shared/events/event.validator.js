const { z } = require('zod')

const domainEventSchema = z.object({
    actor: z.object({
        id: z.number().int(),
        name: z.string(),
    }),
    workspaceId: z.number().int().nullable().optional(),
    boardId: z.number().int().nullable().optional(),
    itemId: z.number().int().nullable().optional(),
    entityType: z.string(),
    entityId: z.number().int(),
    action: z.string(),
    resource: z.record(z.string(), z.any()),
    changes: z.any().optional(),
    snapshot: z.any().optional(),
    specificRecipients: z.array(z.number().int()).optional(),
})

module.exports = {
    domainEventSchema
}