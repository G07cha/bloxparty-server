var Emitter = require('component-emitter')
var randomName = require('random-name')
var clone = require('component-clone')
var cuid = require('cuid')
var queue = require('./queue')

module.exports = Game

/**
 * Initialize `Game` with `player` and `io`
 * @param {Player} player Player instance
 * @param {IO} io     Socket.IO instance
 */
function Game (player, io) {
  if (!(this instanceof Game)) return new Game(player, io)
  var self = this
  this.id = cuid()
  this.name = randomName.place()
  this.columns = 10
  this.rows = 20
  this.players = []
  this.winner = null
  this.active = false
  queue.build()
  this.queue = queue.shapes
  this.interval = setInterval(function () {
    io.sockets.in(self.id).emit('game', self.json())
  }, 45)
  this.newPlayer(player)
}

/**
 * Mixins
 */
Emitter(Game.prototype)

/**
 * Return a JSON representation of this game
 * @return {Object} JSON Object
 * @api public
 */
Game.prototype.json = function json () {
  var players = []

  this.players.forEach(function (player) {
    players.push(player.json())
  })

  var game = {
    id: this.id,
    name: this.name,
    winner: this.winner,
    players: players,
    active: this.active
  }

  return game
}

/**
 * Add a new `Player` instance to this game
 * @param  {Object} attrs Player attributes
 * @api private
 */
Game.prototype.newPlayer = function newPlayer (player) {
  var self = this

  player.on('lost', function () {
    var current = []
    self.players.forEach(function (player) {
      if (player.lost === false) current.push(player)
    })

    if (current.length === 1) self.gameOver(current[0])
  })

  player.on('ready', function () {
    var ready = true
    self.players.some(function (player) {
      if (!player.ready) ready = false
    })
    if (ready) self.start()
  })

  player.socket.on('game:start', function () {
    if (player.id === self.players[0].id) self.start()
  })

  player.gameId = this.id
  player.game = this
  player.queue = this.queue
  player.socket.join(this.id)
  this.players.push(player)
  return player
}

Game.prototype.gameOver = function gameOver (winner) {
  var self = this
  this.winner = winner.id
  winner.stop()
  this.active = false
  queue.shapes = []
  queue.build()
  this.queue = queue.shapes
}

/**
 * Start this game
 * @api public
 */
Game.prototype.start = function start () {
  this.active = true
  this.io.sockets.in(this.id).emit('game:begin')
  this.players.forEach(function (player) {
    player.start()
  })
}
