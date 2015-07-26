/*global describe, it*/
var io = require('socket.io-client')
var assert = require('assert')
var Server = require('../lib/server')
var server
var socket

describe('App', function () {
  beforeEach(function (done) {
    server = Server()
    server.listen()
    socket = io.connect('http://localhost:3001', {
      'forceNew': true,
      query: 'nick=foo'
    })
    socket.on('connect',function () {
      done()
    })
  })

  afterEach(function (done) {
    server.io.httpServer.on('close', function () {
      done()
    })
    server.destroy()
    socket.disconnect()
  })

  describe('App()', function () {
    it('creates a new player on connect', function () {
      assert(server.players.length === 1)
    })
  })
  describe('App#listen', function () {
    it('listens for incoming connections')
  })
  describe('App#stats', function () {
    it('returns a collection of server stats')
  })
  describe('App#sendStats', function () {
    it('broadcasts a collection of server stats')
  })
  describe('App#destroy', function () {
    it('shuts down the server')
  })
})
