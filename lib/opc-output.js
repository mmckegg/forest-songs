var Socket = require('net').Socket
var createOPCStream = require('opc')
var createStrand = require('opc/strand')

module.exports = connect

function connect (opts) {
  var socket = new Socket()
  socket.setNoDelay()
  socket.connect(opts.port, opts.host)

  // Create an Open Pixel Control stream and pipe it to the server
  var stream = createOPCStream()
  stream.pipe(socket)

  // Create a strand representing connected lights
  var strand = createStrand(opts.repeat * opts.length)

  // Write the pixel colors to the device on channel 0

  return function (colors) {
    for (var i = 0; i < opts.length; i++) {
      for (var c = 0; c < opts.repeat; c++) {
        if (colors[i]) {
          strand.setPixel(
            i * opts.repeat + c,
            norm(colors[i][0]),
            norm(colors[i][1]),
            norm(colors[i][2])
          )
        }
      }
    }
    stream.writePixels(0, strand.buffer)
  }
}

function norm (byte) {
  return Math.min(255, Math.round(byte))
}
