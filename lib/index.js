var server = require('./server')()
server.on('ready', function () {
  server.listen()
})

