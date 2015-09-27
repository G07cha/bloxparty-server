var log = require('bole')
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
  this.activePlayers = []
  this.log = log('game')
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
  this.players.push(player)
  this.emit('new player', player)
  this.bindPlayer(player)
  return player
}

/**
 * Player bindings
 * @api private
 */
Game.prototype.bindPlayer = function bindPlayer (player) {
  var self = this
  player.on('lose', function () {
    self.deactivatePlayer(player.id)
    self.checkForWinner()
  })
}

/**
 * Destroy player bindings
 * @api private
 */
Game.prototype.unbindPlayer = function unbindPlayer (player) {
  var self = this
  player.off('lose', function (player) {
    self.deactivatePlayer(player.id)
    self.checkForWinner()
  })
}

/**
 * Distribute new lines to players
 * @param  {String} from   Id of player sending lines
 * @param  {String} to     Id of player receiving lines or all if none
 * @param  {Number} count Number of lines to distribute
 * @api public
 */
Game.prototype.distLines = function distLines (from, to, count) {
  var from = this.players.filter(function (player) {
    return player.id === from
  })

  if (to) {
    this.players.some(function (player) {
      if (player.id === to) {
        player.addLines(count)
        this.log.info('player %s sent %d lines to player %s', from.nick, count, player.nick)
      }
    })
  } else {
    this.players.forEach(function (player) {
      if (player.id === from.id) return
      player.addLines(count)
    })
    this.log.info('player %s sent %d lines to everyone', from.nick, count)
  }
}

/**
 * Deactivate player with `id`
 * @param  {String} id Player id
 * @api public
 */
Game.prototype.deactivatePlayer = function deactivatePlayer (id) {
  this.activePlayers = this.activePlayers.filter(function (playerId) {
    return id !== playerId
  })
}

/**
 * Remove player with `id`
 * @param  {String} id
 * @api public
 */
Game.prototype.removePlayer = function removePlayer (player) {
  this.unbindPlayer(player)
  this.players = this.players.filter(function (p) {
    return p.id !== player.id
  })
  if (this.players.length === 0) this.destroy()
  this.emit('removed player', player.id)
}

/**
 * Check for game winner
 * @api public
 */
Game.prototype.checkForWinner = function checkForWinner () {
  if (this.activePlayers.length > 1) return
  this.stop()
  var winnerId = this.activePlayers[0]
  var winner = this.players.filter(function (player) {
    return winnerId === player.id
  })
  this.winnerName = winner[0].nick
  this.emit('winner', this.winnerName)
  this.log.info('player %s won game %s', this.winnerName, this.name)
}

Game.prototype.setActivePlayers = function setActivePlayers () {
  this.activePlayers = this.players.map(function (player) {
    return player.id
  })
}

/**
 * Start this game
 * @api public
 */
Game.prototype.start = function start () {
  var self = this
  this.active = true
  this.winnerName = null
  this.distQueue()
  this.setActivePlayers()
  this.log.info('starting game %s', this.name)
  setTimeout(function () {
    self.players.forEach(function (player) {
      player.start()
    })
    self.emit('start')
  }, 1000)
}

Game.prototype.stop = function stop () {
  this.active = false
}

Game.prototype.distQueue = function distQueue () {
  var q = queue()
  this.players.forEach(function (player) {
    player.board.queue = clone(q)
    player.socket.emit('board:queue', clone(q))
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
