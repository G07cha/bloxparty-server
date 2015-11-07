/*global describe, it*/
var Emitter = require('component-emitter')
var uid = require('cuid')
var assert = require('assert')
var Player = require('../../server/player')
var Game = require('../../server/game')
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
  return Player({
    nick: uid(),
    socket: socket
  })
}

describe('Game', function () {
  describe('Game()', function () {
    it('returns a new instance', function () {
      assert(Game() !== Game())
    })
  })
  describe('Game#newPlayer', function () {
    it('adds a player to this game', function () {
      var player1 = getPlayer()
      var game = Game()
      assert(player1.game === null)
      game.newPlayer(player1)
      assert(game.players[0] === player1)
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
      game.removePlayer(player1)
      game.removePlayer(player2)
      assert(game.players.length === 0)
    })
  })
  describe('Game#deactivatePlayer', function () {
    it('removes player from list of active players', function () {
      var player = getPlayer()
      var game = Game()

      game.on('start', function () {
        assert(game.activePlayers.length === 1)
        game.deactivatePlayer(player.id)
        assert(game.activePlayers.length === 0)
      })

      game.newPlayer(player)
      game.start()
    })
  })
  describe('Game#checkForWinner', function () {
    it('sets winnerName when winner is found', function () {
      var player1 = getPlayer()
      var game = Game()
      game.newPlayer(player1)
      game.setActivePlayers()
      game.checkForWinner()
      assert(game.winnerName = player1.nick)
    })
  })
  describe('Game#bindPlayer', function () {
    it('inits listener for lose event', function () {
      var player1 = getPlayer()
      var player2 = getPlayer()
      var game = Game()
      game.players.push(player1)
      game.players.push(player2)
      game.setActivePlayers()
      assert(game.activePlayers.length === 2)
      game.bindPlayer(player1)
      player1.emit('lose')
      assert(game.activePlayers.length === 1)
      assert(game.winnerName === player2.nick)
    })
  })
})
