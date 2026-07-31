/**
 * Nome do evento central emitido por qualquer service após uma mutação bem-sucedida.
 * Consumido por LogService, NotificationService, MentionService e UndoService —
 * cada um decide, de forma independente, o que faz com o evento.
 *
 * Shape do evento:
 * {
 *   actor:        User      // quem praticou a ação
 *   workspaceId:  number | null
 *   boardId:      number | null
 *   itemId:       number | null    // null em eventos BOARD/WORKSPACE-level (não notificam)
 *   entityType:   EntityType
 *   entityId:     number
 *   action:       ActivityAction | 'USER_MENTIONED'
 *   resource:     object          // contexto de navegação/exibição (item, column, board...)
 *   changes?:     object          // shape vem de shared/builders/changes.builder.js
 *   snapshot?:    object          // estado completo pré-ação — só quando relevante pra undo
 *   specificRecipients?: number[] // força destinatários (usado por MentionService)
 * }
 */
const DOMAIN_EVENT = 'domain.event'

module.exports = { DOMAIN_EVENT }