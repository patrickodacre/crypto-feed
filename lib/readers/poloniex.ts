import { w3cwebsocket as W3CWebSocket } from "websocket";

// Poloniex Reader
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
let exchangeID: string = "poloniex"

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

    _client = new W3CWebSocket('wss://api2.poloniex.com')

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

                totals.askPriceToTotal[price] = {
                    exchangeID,
                    total: orderBook[0][price],
                }

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

                totals.bidPriceToTotal[price] = {
                    exchangeID,
                    total: orderBook[1][price],
                }

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
                    exchangeID,
                    transaction: 'order',
                    type: 'ask',
                    price,
                    amount,
                }
                emit('ask', payload)
            }

            // bid
            if (type === BID) {
                const payload: OrderEventPayload = {
                    exchangeID,
                    transaction: 'order',
                    type: 'bid',
                    price,
                    amount,
                }
                emit('bid', payload)
            }
        }

        // trade
        if (transaction === "t") {

            const [
                , // ignore this one
                tradeID,
                type,
                price,
                amount,
                timestamp
            ]: TradeUpdate = update

            // sell
            if (type === SELL) {
                const payload: TradeEventPayload = {
                    exchangeID,
                    tradeID,
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
                    exchangeID,
                    tradeID,
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
