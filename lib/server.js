var StringDecoder = require('string_decoder').StringDecoder;
var stream = require('stream')
var util = require('util')
var fs = require('fs')
var url = require('url')
var path = require('path')
var sf = require('slice-file')
var Emitter = require('component-emitter')
var bole = require('bole')
var sio = require('socket.io')
var Player = require('./player')
var Players = require('./players')
var Games = require('./games')
var build = require('./build')
var port = process.env.PORT || 3001
var http = require('http')
var writeStream = fs.createWriteStream('log/log.json', {flags: 'a'})

var mimeTypes = {
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
  var self = this
  this.games = []
  this.Players = Players
  this.Games = Games
  this.port = options.port || port
  this.interval = null
  this.recentEvents = []

  if (options.web) build(options, function () {
    self.emit('build')
  })

  this.getLogs(25, function () {
    self.initLogs()
    self.emit('ready')
  })
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
  var self = this
  this.server = http.createServer(handleRequest)
  this.io = sio(this.server)
  this.server.listen(port)
  this.io.sockets.on('connection', function (socket) {
    if (socket.handshake.query.nick) self.newPlayer(socket)
  })

  if (this.interval) clearInterval(this.interval)

  this.interval = setInterval(function () {
    self.sendStats()
  }, 500)

  function handleRequest (request, response) {
    var uri = url.parse(request.url).pathname
    if (uri === '/') uri = '/index.html'
    var fileName = path.join(process.cwd() + '/public', uri)
    fs.stat(fileName, function (err, stats) {
      if (err) {
        response.writeHead(200, {'Content-Type': 'text/plain'})
        response.write('404 Not Found\n')
        response.end()
        return
      }
      var mimeType = mimeTypes[path.extname(fileName).split('.')[1]]
      response.writeHead(200, {'Content-type': mimeType})
      var fileStream = fs.createReadStream(fileName)
      fileStream.pipe(response)
    })
  }

  var msg = 'Blox Party server listening on port ' + this.port
  this.log.info(msg)
  console.log(msg)
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
  var games = this.Games.map(function (game) {return game.json()})
  var players = this.Players.map(function (player) {return player.json()})
  return {
    games: games,
    players: players,
    logs: this.recentEvents
  }
}

Server.prototype.initLogs = function initLogs () {
  var self = this

  function EchoStream () {
    if (!(this instanceof EchoStream)) return new EchoStream()
    stream.Writable.call(this)
  }

  util.inherits(EchoStream, stream.Writable)

  EchoStream.prototype._write = function (chunk, encoding, done) {
    var decoder = new StringDecoder('utf8');
    writeStream.write(chunk, encoding)
    self.recentEvents.unshift(JSON.parse(decoder.write(chunk)))
    while (self.recentEvents.length > 25) self.recentEvents.pop()
    done()
  }

  var str = EchoStream()

  bole.output([
    {level: 'info', stream: str}
  ])

  this.log = bole('server')
}

Server.prototype.getLogs = function getLogs (numLines, cb) {
  var self = this
  var file
  var str

  file = sf('./log/log.json')

  function LogStream () {
    if (!(this instanceof LogStream)) return new LogStream()
    stream.Writable.call(this)
  }

  util.inherits(LogStream, stream.Writable)

  LogStream.prototype._write = function (chunk, encoding, done) {
    var decoder = new StringDecoder('utf8');
    self.recentEvents.unshift(JSON.parse(decoder.write(chunk)))
    while (self.recentEvents.length > numLines) self.recentEvents.pop()
    done()
  }

  str = LogStream()

  str.on('finish', function () {
    return cb()
  })

  file.slice(-numLines).pipe(str)
}

/**
 * Create a new player from `socket`
 * @param  {Socket} socket
 * @return {Object} player object
 * @api private
 */
Server.prototype.newPlayer = function newPlayer (socket) {
  var self = this
  var req = socket.request
  var nick = req._query['nick']
  var player

  player = self.Players.find(function (player) {
    return player.nick === nick
  })

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

  player.on('destroy', function (player) {
    Players.splice(Players.indexOf(player), 1)
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
  this.Players.forEach(function (player) {
    player.socket.disconnect()
  })
  this.io.httpServer.close()
  this.io.engine.close()
  this.io.close()
  this.emit('destroy')
}
