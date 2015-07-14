var Emitter = require('component-emitter')
var randomName = require('random-name')
var clone = require('component-clone')
var cuid = require('cuid')
var blocks = require('./blocks')

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
  this.io = io
  this.columns = 10
  this.rows = 20
  this.colors = ['cyan', 'orange', 'blue', 'yellow', 'red', 'green', 'purple']
  this.players = []
  this.shapeQueue = []
  this.getShapes()
  this.winner = null
  this.newPlayer(player)
  this.interval = setInterval(function () {
    io.sockets.in(self.id).emit('game', self.json())
  }, 30)
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
    players: players
  }

  return game
}

/**
 * Add 700 shapes to the shapeQueue.  Ensures that there are no
 * duplicates in every 7 shapes
 * @api private
 */
Game.prototype.getShapes = function getShapes () {
  var tempBlocks
  var i
  while (this.shapeQueue.length < 700) {
    tempBlocks = clone(blocks)
    i = 0
    while (i < 7) {
      var id = Math.floor(Math.random() * tempBlocks.length)
      var shape = tempBlocks[id]
      this.shapeQueue.push(shape)
      tempBlocks.splice(id, 1)
      i++
    }
  }
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

  player.game = this
  player.gameId = this.id
  player.socket.join(this.id)
  this.players.push(player)
  return player
}

Game.prototype.gameOver = function gameOver (winner) {
  this.winner = winner.nick
  winner.stop()
}

/**
 * Start this game
 * @api public
 */
Game.prototype.start = function start () {
  this.players.forEach(function (player) {
    player.start()
  })
}
