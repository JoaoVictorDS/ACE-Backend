const { diffUserIds } = require('./notification.utils')
const { getResourceMetadata } = require('../../shared/constants/resource-metadata')

const NotificationDictionary = {

    ITEM_CREATED: (actorName, meta) =>
        `**${actorName}** criou a tarefa **${meta.resource.item.title}**`,

    ITEM_UPDATED: (actorName, meta) => {
        const { before, after } = meta.changes || {}

        return `**${actorName}** renomeou **${before}** para **${after}**`
    },

    ITEM_DELETED: (actorName, meta) =>
        `**${actorName}** removeu a tarefa **${meta.resource.item.title}**`,

    ITEM_MOVED: (actorName, meta) =>
        `**${actorName}** moveu **${meta.resource.item.title}** para outra seção`,

    // ─── ITEM VALUE ────────────────────────────────────────────────────────────

    ITEM_VALUE_CREATED: (actorName, meta, recipientId) => {
        const { item, column } = meta.resource
        const { after, addedUserIds } = meta.changes || {}

        if (column.dataType === 'USER') {
            if (recipientId && addedUserIds?.includes(recipientId)) {
                return `**${actorName}** designou **você** para a tarefa **${item.title}**`
            }
            return `**${actorName}** adicionou responsáveis em **${item.title}**`
        }

        return `**${actorName}** definiu **${column.name}** como **${after}** em **${item.title}**`
    },

    ITEM_VALUE_UPDATED: (actorName, meta, recipientId) => {
        const { item, column } = meta.resource
        const { before, after } = meta.changes || {}

        if (column.dataType === 'USER') {
            const { addedUserIds, removedUserIds } = diffUserIds(before, after)
            if (recipientId && removedUserIds.includes(recipientId)) {
                return `**${actorName}** removeu **você** da tarefa **${item.title}**`
            }
            if (recipientId && addedUserIds.includes(recipientId)) {
                return `**${actorName}** designou **você** para a tarefa **${item.title}**`
            }
            return `**${actorName}** atualizou os responsáveis em **${item.title}**`
        }

        if (column.dataType === 'LONG_TEXT') {
            return `**${actorName}** atualizou **${column.name}** em **${item.title}**`
        }

        return `**${actorName}** alterou **${column.name}** de **${before ?? 'vazio'}** para **${after ?? 'vazio'}** em **${item.title}**`
    },

    ITEM_VALUE_DELETED: (actorName, meta, recipientId) => {
        const { item, column } = meta.resource
        const { before, removedUserIds } = meta.changes || {}

        if (column.dataType === 'USER') {
            if (recipientId && removedUserIds?.includes(recipientId)) {
                return `**${actorName}** removeu **você** da tarefa **${item.title}**`
            }
            return `**${actorName}** removeu responsáveis de **${item.title}**`
        }

        return `**${actorName}** removeu **${before}** de **${column.name}** em **${item.title}**`
    },

    // ─── COMMENTS ──────────────────────────────────────────────────────────────

    COMMENT_CREATED: (actorName, meta) =>
        `**${actorName}** adicionou um comentário em **${meta.resource.item.title}**`,

    COMMENT_UPDATED: (actorName, meta) =>
        `**${actorName}** editou um comentário em **${meta.resource.item.title}**`,

    COMMENT_DELETED: (actorName, meta) =>
        `**${actorName}** removeu um comentário de **${meta.resource.item.title}**`,

    // ─── ITEM UPDATES ──────────────────────────────────────────────────────────

    ITEM_UPDATE_CREATED: (actorName, meta) =>
        `**${actorName}** adicionou uma atualização em **${meta.resource.item.title}**`,

    ITEM_UPDATE_UPDATED: (actorName, meta) =>
        `**${actorName}** editou uma atualização em **${meta.resource.item.title}**`,

    ITEM_UPDATE_DELETED: (actorName, meta) =>
        `**${actorName}** removeu uma atualização de **${meta.resource.item.title}**`,

    // ─── MENTIONS ──────────────────────────────────────────────────────────────

    USER_MENTIONED: (actorName, meta) => {
        const { item, mentionSource } = meta.resource

        const locationMap = {
            COMMENT: `em um comentário em **${item.title}**`,
            ITEM_UPDATE: `em uma atualização de **${item.title}**`
        }

        const location = locationMap[mentionSource] ?? `em **${item.title}**`
        return `**${actorName}** mencionou você ${location}`
    },

    // ─── MEMBERS ───────────────────────────────────────────────────────────────

    MEMBER_CREATED: (actorName, meta, recipientId) => {
        const { member } = meta.resource
        const { after: role } = meta.changes || {}
        const { name, label, to } = _resolveContainer(meta.resource)

        if (recipientId === member.id) {
            return `**${actorName}** adicionou **você** ${to} ${label} **${name}** como **${role}**`
        }
        return `**${actorName}** adicionou **${member.name}** ${to} ${label} **${name}**`
    },

    MEMBER_UPDATED: (actorName, meta, recipientId) => {
        const { member } = meta.resource
        const { after: role } = meta.changes || {}
        const { name, label, in: inPrep } = _resolveContainer(meta.resource)

        if (recipientId === member.id) {
            return `**${actorName}** alterou seu cargo ${inPrep} ${label} **${name}** para **${role}**`
        }
        return `**${actorName}** alterou o cargo de **${member.name}** para **${role}** ${inPrep} ${label} **${name}**`
    },

    MEMBER_DELETED: (actorName, meta, recipientId) => {
        const { member } = meta.resource
        const { name, label, from } = _resolveContainer(meta.resource)

        if (member.selfInitiated) {
            return `**${member.name}** saiu ${from} ${label} **${name}**`
        }
        if (recipientId === member.id) {
            return `**${actorName}** removeu **você** ${from} ${label} **${name}**`
        }
        return `**${actorName}** removeu **${member.name}** ${from} ${label} **${name}**`
    },

    // ─── FALLBACK ──────────────────────────────────────────────────────────────

    DEFAULT: (actorName) =>
        `**${actorName}** realizou uma nova ação`,
}

const _resolveContainer = (resource) => {
    const isBoard = Boolean(resource.board)
    const { singular, gender } = getResourceMetadata(isBoard ? 'BOARD' : 'WORKSPACE')
    const container = isBoard ? resource.board : resource.workspace
    const isFeminine = gender === 'feminine'

    return {
        name: container.name,
        label: singular.toLowerCase(),
        to: isFeminine ? 'à' : 'ao',
        in: isFeminine ? 'na' : 'no',
        from: isFeminine ? 'da' : 'do',
    }
}

module.exports = NotificationDictionary