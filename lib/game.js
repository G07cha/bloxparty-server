var Emitter = require('component-emitter')
var randomName = require('random-name')
var clone = require('component-clone')
var cuid = require('cuid')
var Games = require('./games')
var queue = require('./queue')

module.exports = Game

/**
 * Initialize `Game` with `player` and `io`
 * @param {Player} player Player instance
 * @param {IO} io     Socket.IO instance
 */
function Game () {
  if (!(this instanceof Game)) return new Game()
  var self = this
  this.id = cuid()
  this.name = randomName.place()
  this.columns = 10
  this.rows = 20
  this.players = []
  this.winnerName = null
  this.active = false
  this.queue = queue()
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
    players.push({id: player.id, board: player.board.json()})
  })

  var game = {
    id: this.id,
    name: this.name,
    winnerName: this.winnerName,
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

  player.on('lost', function () {self.checkForWinner()})
  player.on('game:start', function () {
    if (player.id === self.players[0].id) self.start()
  })
  player.on('destroy', function () {
    self.removePlayer(player.id)
  })
  player.board.on('clear lines', function (count) {
    var linesToAdd = 0
    if (count < 2) return
    if (count === 2) linesToAdd = 1
    if (count === 3) linesToAdd = 2
    if (count === 4) linesToAdd = 4
    self.players.forEach(function (p) {
      if (p.id === player.id) return
      p.board.addLines(linesToAdd)
    })
  })

  player.gameId = this.id
  player.game = this
  player.queue = clone(this.queue)
  player.socket.join(this.id)
  this.players.push(player)
  this.emit('new player', player)
  return player
}

/**
 * Remove player with `id`
 * @param  {String} id
 * @api public
 */
Game.prototype.removePlayer = function removePlayer (id) {
  var self = this
  this.players.some(function (player, index) {
    if (player.id !== id) return
    self.players.splice(index, 1)
    return true
  })
  if (this.players.length === 0) this.destroy()
  this.emit('removed player', id)
}

/**
 * Check for game winner
 * @api public
 */
Game.prototype.checkForWinner = function checkForWinner () {
  var currentPlayers = []
  this.players.forEach(function (player) {
    if (player.lost === false) currentPlayers.push(player)
  })
  if (currentPlayers.length !== 1) return
  var winner = currentPlayers[0]
  winner.stop()
  this.winnerName = winner.nick
  this.active = false
  this.emit('winner', this.winnerName)
}

/**
 * Start this game
 * @api public
 */
Game.prototype.start = function start () {
  this.active = true
  this.winnerName = null
  this.players.forEach(function (player) {
    player.start()
  })
  this.emit('start')
}

/**
 * Tear down this game
 * @api private
 */
Game.prototype.destroy = function destroy () {
  var self = this
  Games.forEach(function (game, index) {
    if (game.id === self.id) Games.splice(index, 1)
  })
  this.emit('destroy')
}