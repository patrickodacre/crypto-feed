import EventEmitter from "../eventEmitter"
import io from 'socket.io-client'

export default {
    client,
}

const eventEmitter = EventEmitter()
const DEFAULT_NUM_OF_RECORDS:number = 20
let numberOfRecords:number
let customCommand:ReaderStreamCommand

let _client
let exchangeID: string = "bittrex"

function client() {

    const api: ReaderAPI = {
        start,
        restart,
        close,
        read,

        // data, heartbeat, update, bid, ask, sell, buy, orderbook, error
        on,
    }

    return api
}

function start(n: number = DEFAULT_NUM_OF_RECORDS, command: ReaderStreamCommand = null) : void {

    // Bittrex uses signalr so I can't just connect with
    // a websocket client from the browser. I had to use
    // an existing NodeJS client made for signalR
    // and then pipe the data to the browser using socketio
    _client = io.connect('http://127.0.0.1:3001')

    _client.on('bittrex', data => {
        read(data)
    })
}

function restart() : void {
    _client.close()
    start(numberOfRecords, customCommand)
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
    eventEmitter.emit('close', true)
    _client.close()
}

function on(evt: string, cb: () => any) : void {
    eventEmitter.on(evt, cb)
}
