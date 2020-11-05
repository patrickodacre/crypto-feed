import { w3cwebsocket as W3CWebSocket } from "websocket";
import EventEmitter from "../eventEmitter"

export default {
    client,
}

const eventEmitter = EventEmitter()

let _client: W3CWebSocket
const exchangeID: string = "binance"

function client() {

    const api: ReaderAPI = {
        start,
        close,
        read,
        on,
    }

    return api
}

function on(evt: string, cb: () => any) : void {
    eventEmitter.on(evt, cb)
}

// start begins reading the WS stream.
function start(symbol: string = "ethbtc", depth: number = 5) : void {

    _client = new W3CWebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth${depth}`)

    _client.onopen = () => {
        eventEmitter.emit('open', true)

        return
    }

    _client.onmessage = ({data}) => {
        read(JSON.parse(data))
    }
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
    if (! _client) return
    eventEmitter.emit('close', true)
    _client.close()
}
