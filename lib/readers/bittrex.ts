import EventEmitter from "../eventEmitter"
import io from 'socket.io-client'

export default {
    client,
}

const eventEmitter = EventEmitter()

let _client
const exchangeID: string = "bittrex"

function client() {

    const api: ReaderAPI = {
        start,
        close,
        read,

        // data, heartbeat, update, bid, ask, sell, buy, orderbook, error
        on,
    }

    return api
}

function start() : void {

    // Bittrex uses signalr so I can't just connect with
    // a websocket client from the browser. I had to use
    // an existing NodeJS client made for signalR
    // and then pipe the data to the browser using socketio
    _client = io.connect('http://127.0.0.1:3002')

    _client.on('bittrex', data => {
        read(data)
    })
}

function read(data) : void {

    // allow event listeners to work with the raw data,
    // though in most cases it will be better to
    // listen to the specific events for bid, ask, etc.
    eventEmitter.emit('data', data)

    // bids
    {
        const {bidDeltas} = data

        bidDeltas.forEach(({quantity, rate}) => {

            const payload: OrderEventPayload = {
                exchangeID,
                transaction: 'order',
                type: 'bid',
                price: rate,
                amount: quantity,
            }
            eventEmitter.emit('bid', payload)
        })
    }

    // asks
    {
        const {askDeltas} = data

        askDeltas.forEach(({quantity, rate}) => {

            const payload: OrderEventPayload = {
                exchangeID,
                transaction: 'order',
                type: 'ask',
                price: rate,
                amount: quantity,
            }
            eventEmitter.emit('ask', payload)
        })
    }
}

// close terminates the WS connection
function close() : void {
    if (! _client) return
    eventEmitter.emit('close', true)
    _client.close()
}

function on(evt: string, cb: () => any) : void {
    eventEmitter.on(evt, cb)
}
