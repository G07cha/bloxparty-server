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

function getPlayer () {
  return Player({socket: socket})
}


describe('Game', function () {
  describe('Game()', function () {
    it('returns a new instance', function () {
      var player = getPlayer()
      assert(Game(player) !== Game(player))
    })
  })
  describe('Game#newPlayer', function () {
    it('gives each player the same queue', function () {
      var player1 = getPlayer()
      var player2 = getPlayer()
      var game = Game(player1)
      game.newPlayer(player2)
      assert(player1.queue === player2.queue)
    })
  })
})
