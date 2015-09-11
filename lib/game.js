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
  this.id = cuid()
  this.name = randomName.place()
  this.columns = 10
  this.rows = 20
  this.players = []
  this.winnerName = null
  this.active = false
  this.getQueue()
}

/**
 * Mixins
 */
Emitter(Game.prototype)

Game.prototype.getQueue = function getQueue () {
  this.queue = queue()
}

/**
 * Return a JSON representation of this game
 * @return {Object} JSON Object
 * @api public
 */
Game.prototype.json = function json () {
  var players = []
  var activeLevel = 0

  this.players.forEach(function (player) {
    players.push({id: player.id, nick: player.nick, board: player.board.json()})
    activeLevel = activeLevel + player.board.level
  })

  activeLevel = Math.floor(activeLevel / players.length)

  var game = {
    id: this.id,
    name: this.name,
    winnerName: this.winnerName,
    players: players,
    active: this.active,
    activeLevel: activeLevel
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
  if (!this.queue) this.getQueue()
  player.game = this
  this.players.push(player)
  this.emit('new player', player)
  return player
}

Game.prototype.distLines = function distLines(from, to, amount) {
  if (to) {
    this.players.some(function (player) {
      if (player.id === to) player.board.addLines(amount)
    })
  } else {
    this.players.forEach(function (player) {
      if (player.id === from) return
      player.board.addLines(linesToAdd)
    })
  }
}

/**
 * Remove player with `id`
 * @param  {String} id
 * @api public
 */
Game.prototype.removePlayer = function removePlayer (id) {
  var self = this
  this.players = this.players.filter(function (player) {
    return player.id !== id
  })
  if (this.players.length === 0) this.destroy()
  this.emit('removed player', id)
}

/**
 * Check for game winner
 * @api public
 */
Game.prototype.checkForWinner = function checkForWinner () {
  var currentPlayers = this.players.filter(function (player) {
    return !player.lost
  })

  if (currentPlayers.length !== 1) return
  this.stop()
  var winner = currentPlayers[0]
  this.winnerName = winner.nick
  this.emit('winner', this.winnerName)
}

/**
 * Start this game
 * @api public
 */
Game.prototype.start = function start () {
  var self = this
  if (this.queue.length === 0) this.getQueue()
  this.distQueue()
  this.active = true
  this.winnerName = null

  setTimeout(function () {
    self.players.forEach(function (player) {
      player.start()
    })
  }, 500)

  this.emit('start')
}

Game.prototype.stop = function stop () {
  this.active = false
  this.queue = []
}

Game.prototype.distQueue = function distQueue () {
  var self = this
  if (!this.queue) return
  this.players.forEach(function (player) {
    player.board.queue = clone(self.queue)
  })
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
