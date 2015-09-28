var web = process.env.WEBUI

var server = require('./server')({webui: web})
server.on('ready', function () {
  server.listen()
})

