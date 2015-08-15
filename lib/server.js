var Emitter = require('component-emitter')
var array = require('array')
var sio = require('socket.io')
var Games = require('./games')
var Game = require('./game')
var Player = require('./player')
var Players = require('./players')
var port = process.env.PORT || 3001

/**
 * Expose `App`
 */
module.exports = App

/**
 * Initialize `App` with `options`
 * @param {[type]} options [description]
 */
function App (options) {
  if (!(this instanceof App)) return new App(options)
  var self = this
  this.games = []
  this.players = array()
  this.port = port
  this.interval = null
}

/**
 * Init Socket.io
 * @api public
 */
App.prototype.listen = function listen () {
  var self = this
  this.io = sio()
  this.io.listen(port)
  this.io.sockets.on('connection', function (socket) {
    var req = socket.request
    var nick = req._query['nick']
    var player

    player = Players.find(function (player) {
      return player.nick === nick
    })

    if (player) {
      socket.emit('err', 'That name is taken')
      socket.disconnect()
      return
    }

    player = Player({nick: nick, socket: socket, server: this})
    player.save()
  })

  if (this.interval) clearInterval(this.interval)

  this.interval = setInterval(function () {
    self.sendStats()
  }, 500)

  console.log('Blox Party server listening on port ' + this.port)
}

/**
 * Mixins
 */
Emitter(App.prototype)

/**
 * Get player and game stats
 * @api public
 */
App.prototype.stats = function stats () {
  var games = Games.map(function (game) {return game.json()})
  var players = Players.map(function (player) {return player.json()})
  return {
    games: games,
    players: players
  }
}

/**
 * Broadcast server stats
 * @api private
 */
App.prototype.sendStats = function sendStats () {
  this.io.sockets.emit('stats', this.stats())
}

/**
 * Destroy this server
 * @api public
 */
App.prototype.destroy = function destroy () {
  clearInterval(this.interval)
  this.players.forEach(function (player) {
    player.socket.disconnect()
  })
  this.io.httpServer.close()
  this.io.engine.close()
  this.io.close()
  this.server.close()
}
