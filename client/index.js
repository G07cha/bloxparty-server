import dom from 'virtual-element'
import {render, tree} from 'deku'
import io from 'socket.io-client'
import moment from 'moment'

let port = process.env.PORT || 3001

var socket = io('localhost:' + port)

function wsPlugin () {
  return function (app) {
    app.set('logs', [])
    socket.on('stats', function (data) {
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          app.set(key, data[key])
        }
      }
    })
  }
}

var main = {}

main.propTypes = {
  logs: {source: 'logs'},
  games: {source: 'games'},
  players: {source: 'players'}
}

main.render = function render({props}) {
  let logEls = []
  let logs = props.logs

  logs.forEach(function (log) {
    var el = dom('tr', {}, [
      dom('td', {class: 'Logs-tableCell'}, moment(log.time).format('DD-MM-YYYY, hh:mm A')),
      dom('td', {class: 'Logs-tableCell'}, log.level),
      dom('td', {class: 'Logs-tableCell'}, log.name),
      dom('td', {class: 'Logs-tableCell'}, log.message)
    ])
    logEls.push(el)
  })

  return dom('div', {class: 'Logs'}, [
    dom('table', {class: 'Logs-table'}, [
      dom('thead', {class: 'Logs-tableHead'}, [
        dom('tr', {}, [
          dom('th', 'Time'),
          dom('th', 'Log Level'),
          dom('th', 'Log Name'),
          dom('th', 'Message'),
        ])
      ]),
      dom('tbody', {class: 'Logs-tableBody'}, logEls)
    ])
  ])
}

var app = tree(dom(main))
app.use(wsPlugin())
render(app, document.querySelector('main'))
