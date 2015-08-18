var Emitter = require('component-emitter')
var sio = require('socket.io')
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
  this.games = []
  this.Players = Players
  this.port = port
  this.interval = null
}

/**
 * Mixins
 */
Emitter(App.prototype)

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

    player = self.Players.find(function (player) {
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
  var games = this.Games.map(function (game) {return game.json()})
  var players = this.Players.map(function (player) {return player.json()})
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
  this.Players.forEach(function (player) {
    player.socket.disconnect()
  })
  this.io.httpServer.close()
  this.io.engine.close()
  this.io.close()
}
