/*global describe, it*/
var Emitter = require('component-emitter')
var assert = require('assert')
var Player = require('../lib/player')
var Game = require('../lib/game')
var socket = {}

Emitter(socket)

socket.join = function (room) {
  this.emit('join', room)
}

socket.join = function (room) {
  this.emit('join', room)
}

socket.leave = function (room) {
  this.emit('leave', room)
}

socket.disconnect = function () {
  this.emit('disconnect')
}

function getPlayer () {
  return Player({socket: socket})
}

describe('Game', function () {
  describe('Game()', function () {
    it('returns a new instance', function () {
      var player = getPlayer()
      assert(Game() !== Game())
    })
  })
  describe('Game#newPlayer', function () {
    it('attaches game to player object', function () {
      var player1 = getPlayer()
      var game = Game()
      assert(player1.game === null)
      game.newPlayer(player1)
      assert(player1.game === game)
    })
  })
  describe('Game#removePlayer', function () {
    it('removes a player from the game', function () {
      var player1 = getPlayer()
      var player2 = getPlayer()
      var game = Game()
      assert(game.players.length === 0)
      game.newPlayer(player1)
      game.newPlayer(player2)
      assert(game.players.length === 2)
      player1.quitGame()
      player2.quitGame()
      assert(game.players.length === 0)
    })
  })
})
