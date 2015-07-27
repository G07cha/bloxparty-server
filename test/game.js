/*global describe, it*/
var Emitter = require('component-emitter')
var assert = require('assert')
var Player = require('../lib/player')
var Game = require('../lib/game')
var socket = {}
var player

Emitter(socket)

socket.join = function (room) {
  this.emit('join', room)
}

player = Player({socket: socket})

describe('Game', function () {
  describe('Game()', function () {
    it('returns a new instance', function () {
      assert(Game(player) !== Game(player))
    })
  })
})
