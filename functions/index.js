const admin = require('firebase-admin')

// Initialise Admin SDK once
admin.initializeApp()

// Export BAGE engine functions
const bage = require('./bage')
exports.bageEngine           = bage.bageEngine
exports.expireChallenges     = bage.expireChallenges
exports.weeklyBehaviourReset = bage.weeklyBehaviourReset

// Export auth trigger
const auth = require('./auth')
exports.onUserCreated = auth.onUserCreated

// Export analytics
const analytics = require('./analytics')
exports.generateWeeklyReport = analytics.generateWeeklyReport
