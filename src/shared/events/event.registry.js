const { appEventEmitter } = require('../../config')
const { DOMAIN_EVENT } = require('./event.constants')

const LogEventHandler = require('../../modules/log/log.event-handler')
const NotificationEventHandler = require('../../modules/notification/notification.event-handler')
const MentionEventHandler = require('../../modules/notification/mention.event-handler.js')
const UndoEventHandler = require('../../modules/undo/undo.event-handler')

function register() {
    appEventEmitter.on(DOMAIN_EVENT, LogEventHandler)
    appEventEmitter.on(DOMAIN_EVENT, NotificationEventHandler)
    appEventEmitter.on(DOMAIN_EVENT, MentionEventHandler)
    appEventEmitter.on(DOMAIN_EVENT, UndoEventHandler)
}

module.exports = {
    register
}