import { w3cwebsocket as W3CWebSocket } from "websocket";
import EventEmitter from "../eventEmitter"

export default {
    client,
}

const eventEmitter = EventEmitter()
let depth:number
let symbol:string

let _client: W3CWebSocket
let exchangeID: string = "binance"

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

function on(evt: string, cb: () => any) : void {
    eventEmitter.on(evt, cb)
}

// start begins reading the WS stream.
// the WS stream doesn't seem to offer an option to
// limit the number of records returned with the
// initial orderbook payload, so we'll have to
// limit the records ourselves here.
function start(_symbol: string = "ethbtc", _depth: number = 5) : void {

    symbol = _symbol
    depth = _depth

    _client = new W3CWebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth${depth}`)

    _client.onopen = () => {
        eventEmitter.emit('open', true)

        return
    }

    _client.onmessage = ({data}) => {
        read(JSON.parse(data))
    }
}

function restart() : void {
    _client.close()
    start(symbol, depth)
}

function read(data) : void {

    // allow event listeners to work with the raw data,
    // though in most cases it will be better to
    // listen to the specific events for bid, ask, etc.
    eventEmitter.emit('data', data)

    // bids
    {
        const {bids} = data

        bids.forEach(b => {
            let [price, amount] = b

            const payload: OrderEventPayload = {
                exchangeID,
                transaction: 'order',
                type: 'bid',
                price,
                amount,
            }
            eventEmitter.emit('bid', payload)
        })
    }

    // asks
    {
        const {asks} = data

        asks.forEach(b => {
            let [price, amount] = b

            const payload: OrderEventPayload = {
                exchangeID,
                transaction: 'order',
                type: 'ask',
                price,
                amount,
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
