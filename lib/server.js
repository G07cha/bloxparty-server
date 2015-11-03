'use strict'
const StringDecoder = require('string_decoder').StringDecoder
const fs = require('fs')
const stream = require('stream')
const util = require('util')
const url = require('url')
const path = require('path')
const Emitter = require('component-emitter')
const bole = require('bole')
const sio = require('socket.io')
const Player = require('./player')
const Players = require('./players')
const Games = require('./games')
const port = process.env.PORT || 3001
const http = require('http')

let mimeTypes = {
  'html': 'text/html',
  'js': 'text/javascript',
  'css': 'text/css'
}

/**
 * Expose `Server`
 */
module.exports = Server

/**
 * Initialize `Server` with `options`
 * @param {[type]} options [description]
 */
function Server (options) {
  if (!(this instanceof Server)) return new Server(options)
  options = options || {}
  let self = this
  this.games = []
  this.Players = Players
  this.Games = Games
  this.port = options.port || port
  this.interval = null
  this.recentEvents = []
  this.chatLog = []
  this.initLogs()
}

/**
 * Mixins
 */
Emitter(Server.prototype)

/**
 * Init Socket.io
 * @api public
 */
Server.prototype.listen = function listen () {
  let self = this
  this.server = http.createServer(handleRequest)
  this.io = sio(this.server)
  this.server.listen(port)
  this.io.sockets.on('connection', (socket) => { if (socket.handshake.query.nick) self.newPlayer(socket) })

  if (this.interval) clearInterval(this.interval)

  this.interval = setInterval(() => { self.sendStats() }, 500)

  function handleRequest (request, response) {
    let uri = url.parse(request.url).pathname
    if (uri === '/') uri = '/index.html'
    let fileName = path.join(process.cwd() + '/public', uri)
    fs.stat(fileName, function (err, stats) {
      if (err) {
        response.writeHead(200, {'Content-Type': 'text/plain'})
        response.write('404 Not Found\n')
        response.end()
        return
      }
      let mimeType = mimeTypes[path.extname(fileName).split('.')[1]]
      response.writeHead(200, {'Content-type': mimeType})
      let fileStream = fs.createReadStream(fileName)
      fileStream.pipe(response)
    })
  }

  let msg = 'Blox Party server listening on port ' + this.port
  this.log.info(msg)
}

/**
 * Mixins
 */
Emitter(Server.prototype)

/**
 * Get player and game stats
 * @api public
 */
Server.prototype.stats = function stats () {
  let games = this.Games.map(game => game.json())
  let players = this.Players.map(player => player.json())

  return {
    games: games,
    players: players,
    logs: this.recentEvents,
    chatLog: this.chatLog
  }
}

Server.prototype.initLogs = function initLogs () {
  let self = this

  function EchoStream () {
    if (!(this instanceof EchoStream)) return new EchoStream()
    stream.Writable.call(this)
  }

  util.inherits(EchoStream, stream.Writable)

  EchoStream.prototype._write = function (chunk, encoding, done) {
    let decoder = new StringDecoder('utf8')
    self.recentEvents.unshift(JSON.parse(decoder.write(chunk)))
    while (self.recentEvents.length > 25) self.recentEvents.pop()
    done()
  }

  let str = EchoStream()

  bole.output([
    {level: 'info', stream: str}
  ])

  this.log = bole('server')
}

/**
 * Create a new player from `socket`
 * @param  {Socket} socket
 * @return {Object} player object
 * @api private
 */
Server.prototype.newPlayer = function newPlayer (socket) {
  let self = this
  let req = socket.request
  let nick = req._query['nick']
  let player

  player = self.Players.find(player => player.nick === nick)

  if (player) {
    socket.emit('err', 'That name is taken')
    socket.disconnect()
    return
  }

  player = Player({
    nick: nick,
    socket: socket,
    server: this
  })

  player.on('destroy', player => Players.splice(Players.indexOf(player), 1))
  player.on('server:chat', msg => {
    self.chatLog.push(msg)
  })
  player.save()

  return player
}

/**
 * Broadcast server stats
 * @api private
 */
Server.prototype.sendStats = function sendStats () {
  this.io.sockets.emit('stats', this.stats())
}

/**
 * Destroy this server
 * @api public
 */
Server.prototype.destroy = function destroy () {
  clearInterval(this.interval)
  this.interval = 0
  this.Players.forEach(player => player.socket.disconnect())
  this.io.httpServer.close()
  this.io.engine.close()
  this.io.close()
  this.emit('destroy')
}
