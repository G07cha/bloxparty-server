'use strict'
const Emitter = require('component-emitter')
const finalHandler = require('finalhandler')
const browserify = require('browserify-middleware')
const serveStatic = require('serve-static')
const sio = require('socket.io')
const postcss = require('postcss-middleware')
const postcssImport = require('postcss-import')
const postcssNext = require('postcss-cssnext')
const Router = require('router')
const Player = require('./player')
const Players = require('./players')
const Games = require('./games')
const port = process.env.PORT || 3001
const http = require('http')
const router = Router()

// Configure browserify-middleware
browserify.settings({
  transform: [function (file) {
    return require('babelify')(file, {ignore: 'socket.io-client'})
  }]
})

/**
 * Debugging
 */
function debug (err) {
  console.log(err.stack || err.toString())
}

/**
 * Expose `Server`
 */
module.exports = Server

/**
 * Initialize `Server` with `options`
 * @param {Object} options
 * @api public
 */
function Server (options) {
  if (!(this instanceof Server)) return new Server(options)
  options = options || {}
  this.games = []
  this.Players = Players
  this.Games = Games
  this.port = options.port || port
  this.interval = null
  this.recentEvents = []
  this.chatLog = []
  return this
}

/**
 * Mixins
 */
Emitter(Server.prototype)

/**
 * Build routes
 * @api private
 */
Server.prototype.routes = function routes () {
  // router.get('/index.js', function (req, res) {
  //   const done = finalHandler(req, res, {onerror: debug})
  //   browserify(__dirname + '/../client/index.js')(req, res, done)
  // })
  //
  // router.get('/index.css', function (req, res) {
  //   const done = finalHandler(req, res, {onerror: debug})
  //
  //   postcss({
  //     src: function (req) {
  //       return __dirname + '/../client/index.css'
  //     },
  //     plugins: [
  //       postcssImport,
  //       postcssNext
  //     ]
  //   })(req, res, done)
  // })
}

/**
 * Init server
 * @api public
 */
Server.prototype.listen = function listen () {
  const self = this

  const serve = serveStatic('public', {
    'index': ['index.html']
  })

  this.routes()

  this.server = http.createServer(function (req, res) {
    let done = finalHandler(req, res, {onerror: debug})
    router(req, res, function () {
      serve(req, res, done)
    })
  })

  this.server.listen(port)
  this.io = sio(this.server)
  this.io.sockets.on('connection', (socket) => {
    if (socket.handshake.query.nick) self.newPlayer(socket)
  })

  if (this.interval) clearInterval(this.interval)
  this.interval = setInterval(() => { self.sendStats() }, 500)

  console.log('Blox Party server listening on port ' + this.port)
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
  const games = this.Games.map(game => game.json())
  const players = this.Players.map(player => player.json())

  return {
    games: games,
    players: players,
    logs: this.recentEvents,
    chatLog: this.chatLog
  }
}

/**
 * Create a new player from `socket`
 * @param  {Socket} socket
 * @return {Object} player object
 * @api private
 */
Server.prototype.newPlayer = function newPlayer (socket) {
  const self = this
  const req = socket.request
  const nick = req._query['nick']
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
