const listFormatter = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })

const NotificationDictionary = {
    'ITEM_CREATE': (actorName, meta) =>
        `**${actorName}** criou a tarefa **${meta.itemTitle}**`,

    'ITEM_UPDATE': (actorName, meta, recipientId) => {
        const { itemTitle, changes } = meta || {}

        if (!Array.isArray(changes) || changes.length === 0) {
            return `**${actorName}** editou a tarefa **${itemTitle}**`
        }

        const titleChange = changes.find(c => c.field === 'system_title')
        const columnChanges = changes.filter(c => c.field !== 'system_title')

        if (titleChange && columnChanges.length === 0) {
            return `**${actorName}** renomeou a tarefa de "${titleChange.oldValue}" para **"${titleChange.newValue}"**`
        }

        if (!titleChange && columnChanges.length === 1 && columnChanges[0].isAssignee) {
            const c = columnChanges[0]

            if (recipientId && c.removedUserIds?.includes(recipientId)) {
                return `**${actorName}** removeu **você** da tarefa **${itemTitle}**`
            }

            if (recipientId && c.addedUserIds?.includes(recipientId)) {
                return `**${actorName}** designou **você** para a tarefa **${itemTitle}**`
            }

            let msgParts = []
            if (c.addedUserNames?.length > 0) {
                msgParts.push(`adicionou **${listFormatter.format(c.addedUserNames)}**`)
            }
            if (c.removedUserNames?.length > 0) {
                msgParts.push(`removeu **${listFormatter.format(c.removedUserNames)}**`)
            }

            return msgParts.length > 0
                ? `**${actorName}** ${msgParts.join(' e ')} em **${itemTitle}**`
                : `**${actorName}** editou os responsáveis em **${itemTitle}**` // Fallback seguro
        }

        if (!titleChange && columnChanges.length > 0) {
            if (columnChanges.length === 1) {
                const c = columnChanges[0]
                return `**${actorName}** alterou **${c.label}** de "${c.oldValue}" para "${c.newValue}" em **${itemTitle}**`
            }

            const labels = [...new Set(columnChanges.map(c => c.label))]
            return `**${actorName}** atualizou **${listFormatter.format(labels)}** na tarefa **${itemTitle}**`
        }

        if (titleChange && columnChanges.length > 0) {
            const labels = [...new Set(columnChanges.map(c => c.label))]
            return `**${actorName}** renomeou a tarefa **${itemTitle}** para **"${titleChange.newValue}"** e atualizou **${listFormatter.format(labels)}**`
        }

        return `**${actorName}** atualizou a tarefa **${itemTitle}**`
    },

    'ITEM_DELETE': (actorName, meta) =>
        `**${actorName}** removeu a tarefa: **${meta.itemTitle}**`,

    'ITEM_MOVE': (actorName, meta) =>
        `**${actorName}** moveu **${meta.itemTitle}** para outra seção`,

    'ITEM_ASSIGN': (actorName, meta) =>
        `**${actorName}** designou você para a tarefa **${meta.itemTitle}**`,

    'DEFAULT': (actorName) =>
        `**${actorName}** realizou uma nova ação`
}

module.exports = NotificationDictionary