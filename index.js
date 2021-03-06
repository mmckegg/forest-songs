var audioContext = new global.AudioContext()
var hslToRgb = require('./lib/hsl-to-rgb')
var connect = require('./lib/opc-output')

var send = connect({
  port: 7890,
  host: 'localhost',
  repeat: 8 * 8,
  length: 7
})

navigator.getUserMedia({
  audio: true
}, start, (err) => { console.log(err) })

var analyser = audioContext.createAnalyser()
analyser.fftSize = 4096 * 2
analyser.smoothingTimeConstant = 0.8
analyser.maxDecibels = -10
analyser.minDecibels = -50
var bins = new Uint8Array(analyser.frequencyBinCount)

var lanterns = []
var elements = []
var lanternOutputs = []
var lanternCount = 7

var frameBlend = 0.98

var tuning = 440 // middle a
var noteStart = 50
var noteEnd = noteStart + 12 * 6

for (var i = 0; i < lanternCount; i++) {
  lanterns[i] = []
  lanternOutputs[i] = [0, 0, 0]
  var element = document.createElement('div')
  elements[i] = element
  element.style.height = '100px'
  element.style.width = '100px'
  element.style.float = 'left'
  document.body.appendChild(element)
}

setInterval(tick, 1000 / 60)

function start (stream) {
  var input = audioContext.createMediaStreamSource(stream)
  input.connect(analyser)
}

function tick () {
  analyser.getByteFrequencyData(bins)

  for (var i = noteStart; i < noteEnd; i += 2) {
    var layerId = Math.floor((i - noteStart) / lanternCount)
    var lanternId = i % lanternCount
    lanterns[lanternId][layerId] = getNoteAmp(i)
  }

  refreshOutput()
}

function refreshOutput () {
  for (var i = 0; i < lanternCount; i++) {
    var color = lanternOutputs[i]
    updateLanternColor(lanterns[i], color, i)
    elements[i].style.backgroundColor = cssColor(color)
  }
  send(lanternOutputs)
}

function cssColor (rgb) {
  return `rgb(${norm(rgb[0])}, ${norm(rgb[1])}, ${norm(rgb[2])})`
}

function norm (byte) {
  return Math.min(255, Math.round(byte))
}

function updateLanternColor (layers, target, root) {
  var frameColor = [0, 0, 0]
  layers.forEach((layer, id) => {
    var hue = (id % 8) / 8
    var color = hslToRgb(hue, 1, layer / 255)
    for (var i = 0; i < 3; i++) {
      frameColor[i] = (frameColor[i] || 0) + (color[i] || 0)
    }
  })

  target[0] = Math.max(target[0] * frameBlend, frameColor[0])
  target[1] = Math.max(target[1] * frameBlend, frameColor[1])
  target[2] = Math.max(target[2] * frameBlend, frameColor[2])
}

function average (array, from, to) {
  var sum = 0
  var count = 0
  for (var i = from; i <= to; i++) {
    sum += array[i]
    count += 1
  }
  return (sum / count) || 0
}

function getBin (freq) {
  return Math.round(freq / audioContext.sampleRate * analyser.fftSize)
}

function getFreq (note) {
  return note === 0 || (note > 0 && note < 128) ? Math.pow(2, (note - 69) / 12) * tuning : null
}

function getNoteAmp (note) {
  var from = getBin(getFreq(note - 0.2))
  var to = getBin(getFreq(note + 0.2))
  return average(bins, from, to)
}
