var Board = require('netris-board')
var Emitter = require('component-emitter')
var cuid = require('cuid')
var queue = require('./queue')
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
  this.gameId = false
  this.lost = false
  this.queue = []

  this.socket.on('player:move', function (direction) {self.board.move(direction)})
  this.socket.on('game:start', function () {self.emit('game:start')})
  this.socket.on('game:join', function (id) {self.joinGame(id)})
  this.socket.on('game:quit', function () {self.quitGame()})
  this.socket.on('disconnect', function () {self.destroy()})
  this.socket.emit('client', this.json())

  this.board.on('error', function (err) {
    throw err
  })

  this.board.on('settled', function () {
    self.board.newShape()
  })

  this.board.on('lost', function () {
    self.socket.emit('game:stop')
    self.lost = true
    self.emit('lost')
  })

  this.interval = setInterval(function () {
    self.socket.emit('client', self.json())
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
  var board = this.board.json()

  var game = Games.find(function (game) {
    return game.id === self.gameId
  })

  var json = {
    id: this.id,
    nick: this.nick,
    board: this.board.json(),
    gameId: this.gameId,
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
  if (!id) return this.createGame()
  var game = Games.find(function (game) {
    return game.id === id
  })
  game.newPlayer(this)
  this.gameId = id
  this.emit('join game', id)
  console.log(this.queue[0])
}

/**
 * Create a new game
 * @api private
 */
Player.prototype.createGame = function createGame () {
  var game = Game()
  game.newPlayer(this)
  this.gameId = game.id
  Games.push(game)
  this.emit('create game', game.id)
  console.log(this.queue[0])
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
  this.game = null
  this.gameId = null
  game.removePlayer(this.id)
}

/**
 * Stop the board
 * @api public
 */
Player.prototype.stop = function stop () {
  this.board.stop()
}

Player.prototype.save = function save () {
  Players.push(this)
}

Player.prototype.destroy = function destroy () {
  this.socket.disconnect()
  Players.splice(Players.indexOf(this), 1)
  clearInterval(this.interval)
  this.emit('destroy')
}

/**
 * Start this player's board
 * @api public
 */
Player.prototype.start = function start () {
  var self = this
  this.board.queue = this.queue
  console.log(this.queue[0])
  this.board.reset()
  this.board.newShape()
  this.board.start()
  this.socket.emit('client', this.json())
  this.game.on('winner', function () {
    self.stop()
  })
  this.emit('start')
}