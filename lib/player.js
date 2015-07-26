var Board = require('netris-board')
var Emitter = require('component-emitter')
var cuid = require('cuid')
var queue = require('./queue')
var Games = require('./games')
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
  this.gameId = false
  this.lost = false
  this.queue = []

  this.socket.on('player:move', function (direction) {self.board.move(direction)})
  this.socket.on('game:start', function () {self.emit('start')})
  this.socket.on('game:join', function (id) {self.joinGame(id)})
  this.socket.on('game:quit', function () {self.quitGame()})
  this.socket.on('disconnect', function () {self.disconnect()})
  this.socket.emit('client', this.json())

  this.board.on('settled', function () {
    self.board.newShape(self.queue.shift())
  })

  this.interval = setInterval(function () {
    self.emit('client', self.json())
  }, self.sendRate)
}

/**
 * Mixins
 */
Emitter(Player.prototype)

/**
 * Return a JSON representation of this player
 * @return {JSON} JSON Object
 */
Player.prototype.json = function json() {
  var self = this

  var game = Games.find(function (game) {
    return game.id === self.gameId
  })

  var json = {
    id: this.id,
    nick: this.nick,
    board: this.board.json(),
    nextShape: this.queue[0],
    ready: this.ready,
    gameId: this.gameId,
    shapes: [self.queue[0], self.queue[1]],
    game: game ? game.json() : null
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
  if (!id) this.createGame()
  var game = Games.find(function (game) {
    return game.id === id
  })
  game.newPlayer(player)
  this.gameId = id
}

/**
 * Create a new game
 * @api private
 */
Player.prototype.createGame = function createGame () {
  var game = Game(this)
  this.gameId = game.id
  Games.push(game)
}

/**
 * Disconnect this player
 * @api public
 */
Player.prototype.disconnect = function disconnect () {
  this.socket.disconnect()
  this.emit('disconnect')
  clearInterval(this.interval)
}

/**
 * Quit current game
 * @api private
 */
Player.prototype.quitGame = function quitGame () {
  var id = this.gameId
  var game = Games.find(function (game) {
    return game.id === id
  })
  game.removePlayer(this.id)
}

/**
 * Start this player's board
 * @api public
 */
Player.prototype.start = function start () {
  if (this.interval) clearInterval(this.interval)
  this.board.reset()
  this.board.newShape(this.queue[0])
  this.board.start()
  this.socket.emit('client', this.json())
  this.emit('start')
}