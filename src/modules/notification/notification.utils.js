const extractUserIds = (csv) =>
    csv ? csv.split(',').map(id => Number(id.trim())).filter(id => id > 0) : []

const diffUserIds = (before, after) => {
    const beforeIds = extractUserIds(before)
    const afterIds = extractUserIds(after)
    return {
        addedUserIds: afterIds.filter(id => !beforeIds.includes(id)),
        removedUserIds: beforeIds.filter(id => !afterIds.includes(id)),
    }
}

module.exports = { diffUserIds }