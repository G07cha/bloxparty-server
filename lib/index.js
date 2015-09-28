var web = process.env.WEB

var server = require('./server')({web: web})
server.on('ready', function () {
  server.listen()
})

