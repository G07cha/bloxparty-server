var clone = require('component-clone')

/**
   * Add 7000 shapes to the shapeQueue.  Ensures that there are no
   * duplicates in every 7 shapes
   * @api private
   */
module.exports = function queue () {
  var available = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']
  var shapes = []
  var tempShapes
  while (shapes.length < 700) {
    tempShapes = clone(available)
    while (tempShapes.length > 0) {
      var id = Math.floor(Math.random() * tempShapes.length)
      shapes.push(tempShapes[id])
      tempShapes.splice(id, 1)
    }
  }
  return shapes
}
