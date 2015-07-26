var Emitter = require('component-emitter')
var sio = require('socket.io')
var Games = require('./games')
var Game = require('./game')
var Player = require('./player')
var port = process.env.TETRIS_PORT || 3001

function handler(req, res) {
  // fs.readFile(__dirname + '/index.html',
  // function (err, data) {
  //   if (err) {
  //     res.writeHead(500);
  //     return res.end('Error loading index.html');
  //   }

  // res.writeHead(200);
  // res.end(data);
}

/**
 * Expose `App`
 */
module.exports = App

/**
 * Initialize `App` with `options`
 * @param {[type]} options [description]
 */
function App (options) {
  if (!(this instanceof App)) return new App(options)
  var self = this
  this.games = []
  this.players = []
  this.port = port
  this.interval = null
  this.server = require('http').createServer(handler)
}

/**
 * Init Socket.io
 * @api public
 */
App.prototype.listen = function listen () {
  var self = this
  this.server.listen(port)
  this.io = sio(this.server)
  this.io.sockets.on('connection', function (socket) {
    var req = socket.request
    var nick = req._query['nick']
    var player = Player({nick: nick, socket: socket, server: this})
    self.players.push(player)
  })

  if (this.interval) clearInterval(this.interval)
  this.interval = setInterval(function () {
    self.sendStats()
  }, 500)
}

/**
 * Mixins
 */
Emitter(App.prototype)

/**
 * Get player and game stats
 * @api public
 */
App.prototype.stats = function stats () {
  var games = Games.map(function (game) {return game.json()})
  var players = this.players.map(function (player) {return player.json()})
  return {
    games: games,
    players: players
  }
}

/**
 * Broadcast server stats
 * @api private
 */
App.prototype.sendStats = function sendStats () {
  this.io.sockets.emit('update', this.stats())
}

/**
 * Destroy this server
 * @api public
 */
App.prototype.destroy = function destroy () {
  clearInterval(this.interval)
  this.players.forEach(function (player) {
    player.socket.disconnect()
  })
  this.io.httpServer.close()
  this.io.engine.close()
  this.io.close()
  this.server.close()
}
