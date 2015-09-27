var fs = require('fs')
var Browserify = require('browserify')
var Duo = require('duo')
var babelify = require('babelify')
var myth = require('duo-myth')

var b = Browserify()
var d = Duo(__dirname + '/client')

b.add('./client/index.js', {debug: true})
  .transform(babelify.configure({
    ignore: ['socket.io-client']
  }))
  .bundle()
  .on('error', function (err) {
    console.log('Error : ' + err.message)
  })
  .pipe(fs.createWriteStream('./public/index.js'));

d.entry('index.css')
  .buildTo('../public')
  .use(myth())
  .write(function (err) {
    console.log(err)
  })