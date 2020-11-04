import { w3cwebsocket as W3CWebSocket } from "websocket";

export default {
    client,
}

const events: EventsObj = {}
const ASK:number = 0
const SELL:number = 0
const BID:number = 1
const BUY:number = 1
const DEFAULT_NUM_OF_RECORDS:number = 20
let numberOfRecords:number
let customCommand:ReaderStreamCommand

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

// start begins reading the WS stream.
// the WS stream doesn't seem to offer an option to
// limit the number of records returned with the
// initial orderbook payload, so we'll have to
// limit the records ourselves here.
function start(n: number = DEFAULT_NUM_OF_RECORDS, command: ReaderStreamCommand = null) : void {

    _client = new W3CWebSocket('wss://stream.binance.com:9443/ws/ethbtc@depth5')

    // in read() we'll limit the number of
    // records we write to our order books
    numberOfRecords = n

    _client.onopen = () => {
        emit('open', true)

        return
    }

    _client.onmessage = ({data}) => {
        read(JSON.parse(data))
    }
}

function restart() : void {
    _client.close()
    start(numberOfRecords, customCommand)
}

function read(data) : void {

    // allow event listeners to work with the raw data,
    // though in most cases it will be better to
    // listen to the specific events for bid, ask, etc.
    emit('data', data)

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
            emit('bid', payload)
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
            emit('ask', payload)
        })
    }
}

// close terminates the WS connection
function close() : void {
    emit('close', true)
    _client.close()
}

function on(evt: string, cb: () => any) : void {
    if (! events[evt]) {
        events[evt] = new Array<((payload?: any) => void)>()
    }

    events[evt].push(cb)
}

function emit(evt: string, payload) : void {
    if (! events[evt] || ! Array.isArray(events[evt])) {
        return
    }

    events[evt].forEach(cb => {
        cb(payload)
    })
}
