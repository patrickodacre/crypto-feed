import { w3cwebsocket as W3CWebSocket } from "websocket";
import axios from 'axios'

// Poloniex Reader
export default {
    client,
}

interface PriceToTotal {
    [key: string]: {exchangeID: number, total: string}
}

interface EventsObj {
    [key: string]: ((payload?: any) => void)[]
}
const events: EventsObj = {}

// event payloads
interface OrderBookEventPayload {
    sortedBidPrices: string[],
    sortedAskPrices: string[],
    askPriceToTotal: PriceToTotal,
    bidPriceToTotal: PriceToTotal
}

interface OrderEventPayload {
    exchangeID: number,
    transaction:string,
    type:string,
    price:string,
    amount:number
}

interface TradeEventPayload {
    exchangeID: number,
    tradeID:string,
    transaction:string,
    type:string,
    price:string,
    amount:number,
    timestamp:number
}

interface OrderBookObj {
    [key:string]: number
}

interface OrderBookUpdateObj {
    currencyPair: string,
    orderBook: OrderBookObj[]
}

type OrderBookUpdate = [string, OrderBookUpdateObj]
type OrderUpdate = [string, number, string, string]
type TradeUpdate = [string, string, number, string, string, number]

const ASK:number = 0
const SELL:number = 0
const BID:number = 1
const BUY:number = 1
const DEFAULT_NUM_OF_RECORDS:number = 20
let numberOfRecords:number

interface ReaderStreamCommand {
    command: string,
    channel: string
}

let customCommand:ReaderStreamCommand

let _client: W3CWebSocket
let exchangeID: string = "binance"

interface Provider {
    name: string,
    url: string,
}

interface ReaderAPI {
    provider: () => Provider,
    start: (n?: number, command?: ReaderStreamCommand) => void,
    restart: () => void,
    close: () => void,
    read: (data?: any) => void,
    on: (evt: string, payload: any) => void,
}

function client() {

    const api: ReaderAPI = {
        provider,
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

    // _client = new W3CWebSocket('wss://dex.binance.org/api/ws')
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

// restart allows us to refresh the order book
// after a trade, which ensures we have the most
// up to date asks / bids in the UI
function restart() : void {
    _client.close()
    start(numberOfRecords, customCommand)
}

// read returns [data, error]
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

function provider() : Provider {
    return {
        name: "poloniex",
        url: "https://poloniex.com",
    }
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
