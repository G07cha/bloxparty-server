var Emitter = require('component-emitter')
var sio = require('socket.io')
var Games = require('./games')
var Game = require('./game')
var Player = require('./player')
var port = process.env.TETRIS_PORT || 3001

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
  var io = this.io = sio(port)
  var games = this.games = []
  var players = this.players = []
  this.port = port

  io.sockets.on('connection', function (socket) {
    var req = socket.request
    var nick = req._query['nick']
    var player = Player({nick: nick, socket: socket, server: this})
    players.push(player)

    socket.on('game:join', function (id) {
      if (id) {
        Games.some(function (game) {
          if (game.id === id) {
            game.newPlayer(player)
            player.socket.emit('client', player.json())
            return true
          }
        })
        return
      }
      Games.push(Game(player, io))
      player.socket.emit('client', player.json())
    })

    socket.on('game:quit', function (id) {
      Games.some(function (game) {
        if (game.id === id ) {
          game.removePlayer(player)
          return true
        }
      })
      player.socket.emit('client', player.json())
    })
  })

  setInterval(function () {
    self.sendStats()
  }, 500)
}

Emitter(App.prototype)

App.prototype.stats = function stats () {
  var games = Games.map(function (game) {return game.json()})
  var players = this.players.map(function (player) {return player.json()})
  return {
    games: games,
    players: players
  }
}

App.prototype.sendStats = function sendStats () {
  this.io.sockets.emit('update', this.stats())
}

App.prototype.destroy = function destroy () {
  this.players.forEach(function (player) {
    player.socket.disconnect()
  })
  this.io.httpServer.close()
}
