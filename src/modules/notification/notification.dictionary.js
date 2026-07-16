const NotificationDictionary = {

    'ITEM_CREATED': (actorName, meta) =>
        `**${actorName}** criou a tarefa **${meta.itemTitle}**`,

    'ITEM_UPDATED': (actorName, meta, recipientId) => {
        const { itemTitle, changes } = meta || {}

        if (!changes || typeof changes !== 'object') {
            return `**${actorName}** atualizou a tarefa **${itemTitle}**`
        }

        const { field, label, oldValue, newValue, isAssignee, addedUserIds, removedUserIds } = changes

        if (field === 'system_title') {
            return `**${actorName}** renomeou a tarefa de "${oldValue}" para **"${newValue}"**`
        }

        if (isAssignee) {
            if (recipientId && removedUserIds?.includes(recipientId)) {
                return `**${actorName}** removeu **você** da tarefa **${itemTitle}**`
            }

            if (recipientId && addedUserIds?.includes(recipientId)) {
                return `**${actorName}** designou **você** para a tarefa **${itemTitle}**`
            }

            return `**${actorName}** alterou **${label}** de "${oldValue}" para "${newValue}" em **${itemTitle}**`
        }

        if (field === 'custom_column') {
            const safeOld = oldValue || 'vazio'
            const safeNew = newValue || 'vazio'
            return `**${actorName}** alterou **${label}** de "${safeOld}" para "${safeNew}" em **${itemTitle}**`
        }

        return `**${actorName}** atualizou a tarefa **${itemTitle}**`
    },

    'ITEM_DELETED': (actorName, meta) =>
        `**${actorName}** removeu a tarefa: **${meta.itemTitle}**`,

    'ITEM_MOVED': (actorName, meta) =>
        `**${actorName}** moveu **${meta.itemTitle}** para outra seção`,

    'ITEM_ASSIGNED': (actorName, meta) =>
        `**${actorName}** designou você para a tarefa **${meta.itemTitle}**`,

    'ITEM_UPDATE_CREATED': (actorName, meta) =>
        `**${actorName}** adicionou uma nova atualização na tarefa **${meta.itemTitle}**`,

    'ITEM_UPDATE_UPDATED': (actorName, meta) =>
        `**${actorName}** editou uma atualização na tarefa **${meta.itemTitle}**`,

    'ITEM_UPDATE_DELETED': (actorName, meta) =>
        `**${actorName}** removeu uma atualização da tarefa **${meta.itemTitle}**`,

    'COMMENT_CREATED': (actorName, meta) =>
        `** ${actorName}** adicionou um comentário na tarefa ** ${meta.itemTitle}**`,

    'COMMENT_UPDATED': (actorName, meta) =>
        `** ${actorName}** editou um comentário na tarefa ** ${meta.itemTitle}**`,

    'COMMENT_DELETED': (actorName, meta) =>
        `** ${actorName}** removeu um comentário da tarefa ** ${meta.itemTitle}**`,

    'USER_MENTIONED': (actorName, meta) => {
        if (meta.context === 'comment') {
            return `** ${actorName}** mencionou você em um comentário na tarefa ** ${meta.itemTitle}**`
        }
        return `** ${actorName}** mencionou você na tarefa ** ${meta.itemTitle}**`
    },

    'DEFAULT': (actorName) =>
        `** ${actorName}** realizou uma nova ação`
}

module.exports = NotificationDictionary