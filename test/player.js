/*global describe, it*/
var Emitter = require('component-emitter')
var assert = require('assert')
var array = require('array')
var Player = require('../lib/player')
var Games = require('../lib/games')
var socket = {}
var attrs = {}

Emitter(socket)

socket.join = function (room) {
  this.emit('join', room)
}

attrs.socket = socket

describe('Player', function () {
  describe('Player()', function () {
    it('returns a new instance', function () {
      assert(Player(attrs) !== Player(attrs))
    })
  })

  describe('Player#createGame', function () {
    it('creates a new game', function (done) {
      var player = Player(attrs)
      player.on('create game', function (gameId) {
        assert(player.gameId === gameId)
        assert(Games[0].players[0] === player)
        Games.splice(0, 1)
        done()
      })
      player.createGame()
    })
  })

  describe('Player#joinGame', function () {
    it('creates a new game if no id is given', function (done) {
      var player = Player(attrs)
      player.on('create game', function (gameId) {
        assert(player.gameId === gameId)
        assert(Games[0].players[0] === player)
        Games.splice(0, 1)
        done()
      })
      player.joinGame()
    })
  })
})
