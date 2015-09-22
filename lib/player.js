var Board = require('bloxparty-board')
var Emitter = require('component-emitter')
var cuid = require('cuid')
var Games = require('./games')
var Players = require('./players')
var Game = require('./game')

module.exports = Player

/**
 * Initalize `Player` with `attrs`
 * @param {Object} attrs
 * @api private
 */
function Player (attrs) {
  if (!(this instanceof Player)) return new Player(attrs)
  attrs = attrs || {}
  var self = this
  this.nick = attrs.nick || 'guest'
  this.sendRate = attrs.sendRate || 45
  this.server = attrs.server
  this.id = cuid()
  this.socket = attrs.socket || {}
  this.board = Board()
  this.ready = false
  this.game = null

  this.socket.on('player:move', function (direction) {
    if (self.board.timeout === null) return
    self.board.move(direction)
    self.moveCount = self.moveCount + 1
  })

  this.socket.on('game:start', function () {self.startGame()})
  this.socket.on('game:join', function (id) {self.joinGame(id)})
  this.socket.on('game:quit', function () {self.quitGame()})
  this.socket.on('disconnect', function () {self.destroy()})
  this.socket.on('board:change', function (data) {self.board.sync(data)})
  this.socket.on('board:lose', function () {self.lose()})
  this.socket.emit('client', this.json())

  this.board.on('clear lines', function (count) {
    var linesToAdd = 0
    if (count < 2) return
    if (count === 2) linesToAdd = 1
    if (count === 3) linesToAdd = 2
    if (count === 4) linesToAdd = 4
    self.game.distLines(self.id, false, linesToAdd)
  })

  this.interval = setInterval(function () {
    self.socket.emit('client', self.json())
  }, self.sendRate)

  return this
}

/**
 * Mixins
 */
Emitter(Player.prototype)

/**
 * Return a JSON representation of this player
 * @return {JSON} JSON Object
 */
Player.prototype.json = function json () {
  var self = this

  var game = this.game

  var json = {
    id: this.id,
    nick: this.nick,
    board: this.board.json(),
    game: this.game ? this.game.json() : this.game
  }
  return json
}

/**
 * Join a game with `id`.  If `id` is omitted
 * a new game will be created.
 * @param  {String} id Game ID
 * @api private
 */
Player.prototype.joinGame = function joinGame (id) {
  if (!id) return this.createGame()
  var self = this
  var game = Games.find(function (game) {
    return game.id === id
  })
  game.newPlayer(this)
  this.game = game
  this.game.on('winner', function () {
    self.socket.emit('board:stop')
  })
  this.socket.join(game.id)
  this.emit('join game', id)
}

/**
 * Create a new game
 * @api private
 */
Player.prototype.createGame = function createGame () {
  var game = Game()
  Games.push(game)
  this.joinGame(game.id)
}

Player.prototype.addLines = function addLines (count) {
  this.socket.emit('board:addLines', count)
}

Player.prototype.startGame = function startGame () {
  if (this.game.players[0].id !== this.id) return
  this.game.start()
}

/**
 * Disconnect this player
 * @api public
 */
Player.prototype.disconnect = function disconnect () {
  clearInterval(this.interval)
  this.interval = null
  this.emit('disconnect')
}

/**
 * Quit current game
 * @api private
 */
Player.prototype.quitGame = function quitGame () {
  if (this.game === null) return
  var self = this
  this.socket.leave(this.game.id)
  this.game.removePlayer(this)
  this.board.stop()
  this.board.reset()
  this.game.off()
  this.game = null
  this.emit('quit')
}

/**
 * Lose the game
 * @api private
 */
Player.prototype.lose = function lose () {
  this.emit('lose')
}

/**
 * Save this user to memory
 * @api public
 */
Player.prototype.save = function save () {
  Players.push(this)
  this.emit('save')
}

Player.prototype.destroy = function destroy () {
  this.quitGame()
  clearInterval(this.interval)
  this.interval = null
  this.emit('destroy', this)
}

/**
 * Start this player's board
 * @api public
 */
Player.prototype.start = function start () {
  var self = this
  if (!this.game) return false
  // this.board.reset()
  // this.board.start()
  this.emit('start')
  this.socket.emit('board:start')
  return this
}
