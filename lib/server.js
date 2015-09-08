var Emitter = require('component-emitter')
var sio = require('socket.io')
var Player = require('./player')
var Players = require('./players')
var Games = require('./games')
var port = process.env.PORT || 3001

/**
 * Expose `Server`
 */
module.exports = Server

/**
 * Initialize `Server` with `options`
 * @param {[type]} options [description]
 */
function Server (options) {
  if (!(this instanceof Server)) return new Server(options)
  this.games = []
  this.Players = Players
  this.Games = Games
  this.port = port
  this.interval = null
}

/**
 * Mixins
 */
Emitter(Server.prototype)

/**
 * Init Socket.io
 * @api public
 */
Server.prototype.listen = function listen () {
  var self = this
  this.io = sio()
  this.io.listen(port)
  this.io.sockets.on('connection', function (socket) {
    self.newPlayer(socket)
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
Emitter(Server.prototype)

/**
 * Get player and game stats
 * @api public
 */
Server.prototype.stats = function stats () {
  var games = this.Games.map(function (game) {return game.json()})
  var players = this.Players.map(function (player) {return player.json()})
  return {
    games: games,
    players: players
  }
}

/**
 * Create a new player from `socket`
 * @param  {Socket} socket
 * @return {Object} player object
 * @api private
 */
Server.prototype.newPlayer = function newPlayer (socket) {
  var self = this
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

  player = Player({
    nick: nick,
    socket: socket,
    server: this
  })

  player.on('destroy', function (player) {
    Players.splice(Players.indexOf(player), 1)
  })

  player.save()

  return player
}

/**
 * Broadcast server stats
 * @api private
 */
Server.prototype.sendStats = function sendStats () {
  this.io.sockets.emit('stats', this.stats())
}

/**
 * Destroy this server
 * @api public
 */
Server.prototype.destroy = function destroy () {
  clearInterval(this.interval)
  this.interval = 0
  this.Players.forEach(function (player) {
    player.socket.disconnect()
  })
  this.io.httpServer.close()
  this.io.engine.close()
  this.io.close()
  this.emit('destroy')
}
