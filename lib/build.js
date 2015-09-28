var fs = require('fs')
var Browserify = require('browserify')
var envify = require('envify/custom')
var Duo = require('duo')
var babelify = require('babelify')
var myth = require('duo-myth')

/**
 * Expose `Build`
 * @api public
 */
module.exports = build

function build (options, cb) {
  var b = Browserify()
  var d = Duo(__dirname + '/../client')
  var ws = fs.createWriteStream('./public/index.js')
  var steps = 2

  function done () {
    --steps
    if (steps === 0) return cb()
  }

  ws.on('finish', function () {
    done()
  })

  console.info('Building client files...')

  // Browserify
  b.add('./client/index.js', {debug: true})
    .transform(babelify.configure({
      jsxPragma: 'element',
      ignore: ['socket.io-client']
    }))
    .transform(envify({
      PORT: options.port || process.env.PORT || 3001
    }))
    .bundle()
    .on('error', function (err) {
      throw new Error(err)
    })
    .pipe(ws);

  // Duo
  d.entry('index.css')
    .buildTo('../public')
    .use(myth())
    .write(function (err) {
      if (err) throw new Error(err)
      done()
    })
}