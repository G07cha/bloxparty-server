/*global describe, it*/
var Emitter = require('component-emitter')
var clone = require('component-clone')
var assert = require('assert')
var Player = require('../lib/player')
var Games = require('../lib/games')
var Players = require('../lib/players')
var socket = {}

Emitter(socket)

socket.join = function (room) {
  this.emit('join', room)
}

socket.disconnect = function () {
  this.emit('disconnect')
}

function attrs () {
  var s =  clone(socket)
  return {
    socket: s,
    nick: 'foo'
  }
}

afterEach(function (done) {
  while (Players.length > 0) {
    Players.pop()
  }
  done()
})

describe('Player', function () {
  describe('Player()', function () {
    it('returns a new instance', function () {
      assert(Player(attrs()) !== Player(attrs()))
    })
  })

  describe('Player#json', function () {
    it('returns player.id', function () {
      assert(Player(attrs()).json().id)
    })
    it('returns player.nick', function () {
      assert(Player(attrs()).json().nick === 'foo')
    })
    it('returns player.board', function () {
      assert(Player(attrs()).json().board)
    })
    it('returns player.game', function () {
      assert.equal(Player(attrs()).json().game, null)
    })
  })

  describe('Player#disconnect', function () {
    it('emits disconnect', function (done) {
      var player = Player(attrs())
      player.on('disconnect', function () {
        done()
      })
      player.disconnect()
    })
    it('clears player interval', function (done) {
      var player = Player(attrs())
      player.on('disconnect', function () {
        assert(player.interval === null)
        done()
      })
      player.disconnect()
    })
  })

  describe('Player#quitGame', function () {
    it('sets Player.game to null', function (done) {
      var player = Player(attrs())

      player.on('quit', function () {
        assert(player.game === null)
        done()
      })

      player.on('create game', function (gameId) {
        assert(player.gameId === gameId)
        assert(Games[0].players[0] === player)
        player.quitGame()
      })
      player.createGame()
    })
  })

  describe('Player#createGame', function () {
    it('creates a new game', function (done) {
      var player = Player(attrs())
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
      var player = Player(attrs())
      player.on('create game', function (gameId) {
        assert(player.gameId === gameId)
        assert(Games[0].players[0] === player)
        Games.splice(0, 1)
        done()
      })
      player.joinGame()
    })
  })

  describe('Player#lose', function () {
    it('emits lose', function (done) {
      var player = Player(attrs())
      player.on('lose', function () {
        assert(true)
        done()
      })
      player.lose()
    })
    it('emits game:lose on the player socket', function (done) {
      var player = Player(attrs())
      player.socket.on('game:lose', function () {
        assert(true)
        done()
      })
      player.lose()
    })
    it('sets player.lost to true', function (done) {
      var player = Player(attrs())
      player.on('lose', function () {
        assert(player.lost === true)
        done()
      })
      player.lose()
    })
  })

  describe('Player#stopBoard', function () {
    it('clears the player board timeout', function (done) {
      var player = Player(attrs())
      player.createGame()
      player.game.getQueue()
      player.game.pre()
      player.start()
      assert(player.board.timeout !== null)
      player.on('board:stop', function () {
        assert(player.board.timeout === null)
        done()
      })
      player.stopBoard()
    })
  })

  describe('Player#save', function () {
    it('adds Player to memory store', function () {
      assert(Players.length === 0)
      var player = Player(attrs())
      player.save()
      assert(Players.length === 1)
    })
  })

  describe('Player#destroy', function () {
    it('emits destroy event', function (done) {
      var player = Player(attrs())
      assert(player.interval !== null)
      player.on('destroy', function () {
        assert(true)
        done()
      })
      player.destroy()
    })
    it('clears player.interval', function (done) {
      var player = Player(attrs())
      assert(player.interval !== null)
      player.on('destroy', function () {
        assert(player.interval === null)
        done()
      })
      player.destroy()
    })
  })

  describe('Player#start', function () {
    it('returns false if player is not in game', function () {
      var player = Player(attrs())
      assert(player.start() === false)
    })
    it('emits start event', function (done) {
      var player = Player(attrs())
      player.createGame()
      player.game.getQueue()
      player.game.pre()
      assert(player.interval !== null)
      player.on('start', function () {
        assert(true)
        done()
      })
      player.start()
    })
    it('emits client event on socket', function (done) {
      var player = Player(attrs())
      player.socket.on('client', function (json) {
        assert(json.id === player.id)
        done()
      })
      player.createGame()
      player.game.getQueue()
      player.game.pre()
      player.start()
    })
  })
})
