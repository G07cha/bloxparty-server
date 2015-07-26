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
function Game (player) {
  if (!(this instanceof Game)) return new Game(player, io)
  var self = this
  this.id = cuid()
  this.name = randomName.place()
  this.columns = 10
  this.rows = 20
  this.players = []
  this.winner = null
  this.active = false
  this.queue = queue()
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
    players.push({playerId: player.id, board: player.board.json()})
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

  player.on('lost', function () {self.checkForWinner()})
  player.on('start', function () {
    if (player.id === self.players[0].id) self.start()
  })

  player.gameId = this.id
  player.game = this
  player.queue = this.queue
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
  this.players.some(function (player) {
    if (player.id !== id) return
    self.players.splice(index, 1)
    return true
  })
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
  this.winnerId = winner.id
  this.active = false
  this.emit('winner', this.winnerId)
}

/**
 * Start this game
 * @api public
 */
Game.prototype.start = function start () {
  this.active = true
  this.players.forEach(function (player) {
    player.start()
  })
  this.emit('start')
}
