var Emitter = require('component-emitter')
var cuid = require('cuid')
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
  this.server = attrs.server
  this.id = cuid()
  this.socket = attrs.socket || {}
  this.board = []
  this.ready = false
  this.gameId = false
  this.currentBlockReference = 0
  this.currentBlockShape = 0
  this.currentBlock = null
  this.currentX = 0
  this.currentY = 0
  this.lost = false

  this.socket.on('player:move', function (direction) {self.move(direction)})
  this.socket.on('disconnect', function () {self.disconnect()})
  this.socket.emit('client', this.json())
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
  var json = {
    id: this.id,
    nick: this.nick,
    board: this.board,
    currentBlockReference: this.currentBlockReference,
    currentBlockShape: this.currentBlockShape,
    currentBlock: this.currentBlock,
    ready: this.ready,
    gameId: this.gameId,
    currentX: this.currentX,
    currentY: this.currentY
  }
  return json
}

/**
 * Disconnect this player
 * @api public
 */
Player.prototype.disconnect = function disconnect () {}

/**
 * Draw the next shape on this player's board
 * @api private
 */
Player.prototype.createShape = function createShape () {
  this.currentBlock = this.game.shapeQueue[this.currentBlockReference]
  ++this.currentBlockReference
  // position where the shape will evolve
  this.currentX = 0
  this.currentY = 0
}

/**
 * Stop shape at its position and fix it to board
 * @api private
 */
Player.prototype.freeze = function freeze () {
  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      if (this.currentBlock.shapes[this.currentBlockShape][y][x]) {
        this.board[y + this.currentY ][x + this.currentX ] = this.currentBlock.color
      }
    }
  }
}

/**
 * Clear this player's board
 * @api private
 */
Player.prototype.clear = function clear () {
  for (var y = 0; y < this.game.rows; ++y) {
    this.board[y] = []
    for (var x = 0; x < this.game.columns; ++x) {
      this.board[y][x] = 0
    }
  }
}

/**
 * Drop a player's piece to the bottom
 * of the board
 * @api private
 */
Player.prototype.dropPiece = function dropPiece () {
  while (this.valid(0, 1)) {
    ++this.currentY
  }
  this.game.emit('update', this)
}

/**
 * Check if any lines are filled and clear them
 * @api private
 */
Player.prototype.clearLines = function clearLines () {
  var length = this.game.rows - 1
  var x = 0
  var y = 0
  for (y = length; y >= 0; --y) {
    var rowFilled = true
    for (x = 0; x < this.game.columns; ++x) {
      if (this.board[y][x] === 0) {
        rowFilled = false
        break
      }
    }
    if (rowFilled) {
      for (var yy = y; yy > 0; --yy) {
        for (x = 0; x < this.game.columns; ++x) {
          this.board[yy][x] = this.board[yy - 1 ][x]
        }
      }
      ++y
    }
  }
}

/**
 * Attempt to move piece in `direction`
 * @api private
 */
Player.prototype.move = function move (direction) {
  switch (direction) {
    case 'left':
      if (this.valid(-1)) {
        --this.currentX
      }
      break
    case 'right':
      if (this.valid(1)) {
        ++this.currentX
      }
      break
    case 'down':
      if (this.valid(0, 1)) {
        ++this.currentY
      }
      break
    case 'drop':
      while (this.valid(0, 1)) {
        ++this.currentY
      }
      break
    case 'rotate':
      var block = this.rotate()
      if (this.valid(0, 0, block)) {
        this.currentBlockShape = block
      }
      break
  }
}

/**
 * Checks if the resulting position of current shape will be feasible
 * @param  {Number} offsetX
 * @param  {Number} offsetY
 * @param  {Array} block Supply a block other than the current block to validate
 * @return {Boolean}
 */
Player.prototype.valid = function valid (offsetX, offsetY, block) {
  offsetX = offsetX || 0
  offsetY = offsetY || 0
  offsetX = this.currentX + offsetX
  offsetY = this.currentY + offsetY
  if (typeof block !== 'undefined') {
    block = this.currentBlock.shapes[block]
  } else {
    block = this.currentBlock.shapes[this.currentBlockShape]
  }

  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      if (block[y][x]) {
        if (typeof this.board[y + offsetY ] === 'undefined' ||
          typeof this.board[y + offsetY ][x + offsetX ] === 'undefined' ||
          this.board[y + offsetY ][x + offsetX ] ||
          x + offsetX < 0 ||
          y + offsetY >= this.game.rows ||
          x + offsetX >= this.game.columns) {
          if (offsetY === 1) this.lost = true // lost if the current shape at the top row when checked
          return false
        }
      }
    }
  }
  return true
}

/**
 * Game loop
 * @api private
 */
Player.prototype.tick = function tick () {
  if (this.valid(0, 1)) {
    ++this.currentY
  } else {
    // if the element settled
    this.freeze()
    this.clearLines()
    if (this.lost) {
      this.emit('lost')
      this.stop()
    }
    this.createShape()
  }
}

/**
 * Start this player's board
 * @api public
 */
Player.prototype.start = function start () {
  var self = this
  this.lost = false
  this.clear()
  this.createShape()
  this.interval = setInterval(function () {
    self.tick()
  }, 750)
  this.emit('start')
}

/**
 * Freeze this player's board in place
 * @api public
 */
Player.prototype.stop = function stop () {
  this.freeze()
  clearInterval(this.interval)
}

/**
 * Rotates the current shape perpendicularly anticlockwise
 * @api private
 */
Player.prototype.rotate = function rotate () {
  return this.currentBlockShape === 3 ? 0 : this.currentBlockShape + 1
}
