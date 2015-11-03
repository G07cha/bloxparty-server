'use strict'
const Board = require('bloxparty-board')
const Emitter = require('component-emitter')
const log = require('bole')
const cuid = require('cuid')
const Games = require('./games')
const Players = require('./players')
const Game = require('./game')

module.exports = Player

/**
 * Initalize `Player` with `attrs`
 * @param {Object} attrs
 * @api private
 */
function Player (attrs) {
  if (!(this instanceof Player)) return new Player(attrs)
  attrs = attrs || {}
  let self = this
  this.nick = attrs.nick || 'guest'
  this.sendRate = attrs.sendRate || 45
  this.server = attrs.server
  this.id = cuid()
  this.socket = attrs.socket || {}
  this.board = Board()
  this.ready = false
  this.game = null
  this.log = log('player')

  this.log.info('%s connected', this.nick)

  this.socket.on('player:move', direction => { if (self.board.timeout) self.board.move(direction) })
  this.socket.on('game:start', () => self.startGame())
  this.socket.on('game:join', (id) => self.joinGame(id))
  this.socket.on('game:quit', () => self.quitGame())
  this.socket.on('disconnect', () => self.destroy())
  this.socket.on('board:change', (data) => self.board.sync(data))
  this.socket.on('board:lose', () => self.lose())
  this.socket.on('player:chat', (msg) => self.chat(msg))

  this.socket.on('board:clearLines', function (count) {
    let linesToAdd = 0
    if (count < 2) return
    if (count === 2) linesToAdd = 1
    if (count === 3) linesToAdd = 2
    if (count === 4) linesToAdd = 4
    self.game.distLines(self.id, false, linesToAdd)
  })

  this.board.on('grid', () => self.socket.emit('board:grid', this.json().grid))
  this.interval = setInterval(() => { self.socket.emit('client', self.json()) }, self.sendRate)
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
  let json = {
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
  let self = this
  let game = Games.find(game => game.id === id)
  game.newPlayer(this)
  this.game = game
  this.game.on('winner', () => self.socket.emit('board:stop'))
  this.socket.join(game.id)
  this.emit('join game', id)
  this.log.info('%s joined game %s', this.nick, game.name)
}

/**
 * Create a new game
 * @api private
 */
Player.prototype.createGame = function createGame () {
  let game = Game()
  this.log.info('%s created game %s', this.nick, game.name)
  Games.push(game)
  this.joinGame(game.id)
}

Player.prototype.chat = function chat (msg) {
  var msgObject = {
    text: msg,
    nick: this.nick,
    date: Date.now()
  }
  if (!this.game) return this.emit('server:chat', msgObject)
  this.emit('game:chat', msgObject)
}

Player.prototype.startGame = function startGame () {
  if (this.game.players[0].id === this.id) this.game.start()
}

Player.prototype.addLines = function addLines (count) {
  this.socket.emit('board:addLines', count)
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
  this.board.stop()
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
  this.log.info('player %s disconnected', this.nick)
  this.emit('destroy', this)
}

/**
 * Start this player's board
 * @api public
 */
Player.prototype.start = function start () {
  if (!this.game) return false
  this.socket.emit('board:start')
  this.board.reset()
  // this.board.start()
  this.emit('start')
  return this
}
