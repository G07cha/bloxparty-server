/*global describe, it*/
var Emitter = require('component-emitter')
var assert = require('assert')
var Player = require('../lib/player')
var socket = {}

Emitter(socket)

var attrs = {
  socket: socket
}

describe('Player', function () {
  describe('Player()', function () {
    it('returns a new instance', function () {
      assert(Player(attrs) !== Player(attrs))
    })
  })
})
