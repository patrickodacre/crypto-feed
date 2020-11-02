import { w3cwebsocket as W3CWebSocket } from "websocket";

// Poloniex Reader
export default {
    client,
}

interface PriceToTotal {
    [key: string]: string
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
    transaction:string,
    type:string,
    price:string,
    amount:number
}

interface TradeEventPayload {
    id:string,
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

interface Provider {
    name: string,
    url: string,
}

interface ReaderAPI {
    provider: () => Provider,
    updatePriceToTotal: (priceToTotal: PriceToTotal, price: string, amount: number) => PriceToTotal,
    start: (n?: number, command?: ReaderStreamCommand) => void,
    restart: () => void,
    close: () => void,
    read: (data?: any) => void,
    on: (evt: string, payload: any) => void,
}

function client() {
    _client = new W3CWebSocket('wss://api2.poloniex.com')

    const api: ReaderAPI = {
        provider,
        updatePriceToTotal,
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

    // in read() we'll limit the number of
    // records we write to our order books
    numberOfRecords = n

    _client.onopen = () => {
        emit('open', true)

        if (command) {
            customCommand = command
            _client.send(JSON.stringify(command))
        } else {
            _client.send(JSON.stringify({"command": "subscribe", "channel": "BTC_ETH"}))
        }
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

    // just return the totals we have,
    // this is just a heartbeat from Poloniex
    if (data === 1010) {
        emit('heartbeat', true)
        return
    }

    // array
    const updates = data[2]

    if (! updates) {
        emit('update', false)
        return
    }

    // Order Book message:
    if ("i" === updates[0][0]) {

        const totals:OrderBookEventPayload = {
            sortedBidPrices: [],
            sortedAskPrices: [],
            askPriceToTotal: {},
            bidPriceToTotal: {},
        }

        // can we have corrupt data from Poloniex?
        if (! updates[0][1] || ! updates[0][1].orderBook) {
            emit('error', new Error("There is a problem with the order book."))
            return
        }

        const {orderBook}: OrderBookObj = updates[0][1]

        // these order books can be huge, with 4000+ records,
        // (apparently without an option to limit the returned data)
        // and it's UNlikely a user would be interested in
        // the most expensive asks or lowest bids,
        // so I'll only show the N cheapest asks and N highest bids.

        // asks
        if (orderBook[0]) {

            let count: number = 0
            for (const price in orderBook[0]) {
                if (count == numberOfRecords) break

                const amount: number = parseFloat(orderBook[0][price])

                totals.askPriceToTotal = updatePriceToTotal(totals.askPriceToTotal, price, amount)

                count++
            }

            // ASC order b/c with ASKS users would be interested in the lowest asks
            totals.sortedAskPrices = Object.keys(totals.askPriceToTotal).sort()
        }

        // bids
        if (orderBook[1]) {

            let count: number = 0
            for (const price in orderBook[1]) {
                if (count == numberOfRecords) break

                const amount: number = parseFloat(orderBook[1][price])

                totals.bidPriceToTotal = updatePriceToTotal(totals.bidPriceToTotal, price, amount)

                count++
            }

            // DESC order b/c with BIDS users would be interested in the highest bids
            totals.sortedBidPrices = Object.keys(totals.bidPriceToTotal).sort((a:string,b:string) => parseFloat(b)-parseFloat(a))
        }

        emit('orderbook', totals)

        return
    }


    // if this isn't an order book entry,
    // or a heartbeat message checked above,
    // then we're looking at updates for bids, asks or trades (buy, sell)
    updates.forEach(update => {
        const [transaction] = update

        // order
        if (transaction === "o") {

            const [
                , // ignore this one
                type,
                price,
                amount
            ]: OrderUpdate = update

            // ask
            if (type === ASK) {
                const payload: OrderEventPayload = {
                    transaction: 'order',
                    type: 'ask',
                    price,
                    amount: parseFloat(amount),
                }
                emit('ask', payload)
            }

            // bid
            if (type === BID) {
                const payload: OrderEventPayload = {
                    transaction: 'order',
                    type: 'bid',
                    price,
                    amount: parseFloat(amount),
                }
                emit('bid', payload)
            }
        }

        // trade
        if (transaction === "t") {

            const [
                , // ignore this one
                id,
                type,
                price,
                amount,
                timestamp
            ]: TradeUpdate = update

            // sell
            if (type === SELL) {
                const payload: TradeEventPayload = {
                    id,
                    transaction: 'trade',
                    type: 'sell',
                    price,
                    amount: parseFloat(amount),
                    timestamp,
                }

                emit('trade', payload)
                emit('sell', payload)
            }

            // buy
            if (type === BUY) {
                const payload: TradeEventPayload = {
                    id,
                    transaction: 'trade',
                    type: 'buy',
                    price,
                    amount: parseFloat(amount),
                    timestamp,
                }

                emit('trade', payload)
                emit('buy', payload)
            }

        }

    })
}

function updatePriceToTotal(
    priceToTotal: PriceToTotal,
    price: string,
    amount: number
) : PriceToTotal
{

    // avoid mutation by reference
    const t: PriceToTotal = JSON.parse(JSON.stringify(priceToTotal))

    if (! t[price]) {
        t[price] = "0.00000000"
    }

    const currentAmount: number = parseFloat(t[price])

    // price needs to remain a string
    // @ts-ignore
    t[price] = parseFloat(currentAmount + amount).toFixed(8)

    if (! t[price]) {
        emit('error', new Error("Price Error"))

        // at least we won't break the UI
    }

    return t
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
