import { w3cwebsocket as W3CWebSocket } from "websocket";

// Poloniex Reader
export default {
    client,
}

const ASK = 0
const SELL = 0
const BID = 1
const BUY = 1

const events = {}
let _client = null
const DEFAULT_NUM_OF_RECORDS = 20
let numberOfRecords = null

function client() {
    _client = new W3CWebSocket('wss://api2.poloniex.com')

    return {
        provider,
        updatePriceToTotal,
        read,
        restart,
        start,
        close,

        // data, heartbeat, update, bid, ask, sell, buy, orderbook, error
        on,
    }
}

// start begins reading the WS stream.
// the WS stream doesn't seem to offer an option to
// limit the number of records returned with the
// initial orderbook payload, so we'll have to
// limit the records ourselves here.
function start(n = DEFAULT_NUM_OF_RECORDS, command = null) {

    // in read() we'll limit the number of
    // records we write to our order books
    numberOfRecords = n

    _client.onopen = () => {
        emit('open', true)

        if (command) {
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
function restart() {
    _client.close()
    _client.start(numberOfRecords)
}

// read returns [data, error]
function read(data) {

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

    const [streamID, seq] = data

    // array
    const updates = data[2]

    if (! updates) {
        emit('update', false)
        return
    }

    // Order Book message:
    if ("i" === updates[0][0]) {

        const totals = {
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

        const {orderBook} = updates[0][1]

        // these order books can be huge, with 4000+ records,
        // (apparently without an option to limit the returned data)
        // and it's UNlikely a user would be interested in
        // the most expensive asks or lowest bids,
        // so I'll only show the N cheapest asks and N highest bids.

        // asks
        if (orderBook[0]) {

            let count = 0
            for (const price in orderBook[0]) {
                if (count == numberOfRecords) break

                const amount = orderBook[0][price]

                totals.askPriceToTotal = updatePriceToTotal(totals.askPriceToTotal, price, amount)

                count++
            }

            // ASC order b/c with ASKS users would be interested in the lowest asks
            totals.sortedAskPrices = Object.keys(totals.askPriceToTotal).sort()
        }

        // bids
        if (orderBook[1]) {

            let count = 0
            for (const price in orderBook[1]) {
                if (count == numberOfRecords) break

                const amount = orderBook[1][price]

                totals.bidPriceToTotal = updatePriceToTotal(totals.bidPriceToTotal, price, amount)

                count++
            }

            // DESC order b/c with BIDS users would be interested in the highest bids
            totals.sortedBidPrices = Object.keys(totals.bidPriceToTotal).sort((a,b) => b-a)
        }

        emit('orderbook', totals)

        return
    }


    // if this isn't an order book entry,
    // or a heartbeat message checked above,
    // then we're looking at updates for bids, asks or trades (buy, sell)
    updates.forEach(update => {
        const [transaction, type, price, amount] = update

        // order
        if (transaction === "o") {
            // ask
            if (type === ASK) {
                emit('ask', {
                    transaction: 'order',
                    type: 'ask',
                    price,
                    amount: parseFloat(amount),
                })
            }

            // bid
            if (type === BID) {
                emit('bid', {
                    transaction: 'order',
                    type: 'bid',
                    price,
                    amount: parseFloat(amount),
                })
            }
        }

        // trade
        if (transaction === "t") {

            const [,id,type,price,amount,timestamp] = update

            // sell
            if (type === SELL) {
                const payload = {
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
                const payload = {
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

function updatePriceToTotal(priceToTotal, price, amount) {

    // avoid mutation by reference
    const t = JSON.parse(JSON.stringify(priceToTotal))

    if (! t[price]) {
        t[price] = 0
    }

    const currentAmount = parseFloat(t[price])

    t[price] = parseFloat(currentAmount + amount).toFixed(8)

    if (! t[price]) {
        emit('error', new Error("Price Error", t[price]))

        // at least we won't break the UI
        t[price] = parseFloat(0).toFixed(8)
    }

    return t
}

// close terminates the WS connection
function close() {
    emit('close', true)
    _client.close()
}

function provider() {
    return {
        name: "poloniex",
        url: "https://poloniex.com",
    }
}

function on(evt, cb) {
    if (! events[evt]) {
        events[evt] = []
    }

    events[evt].push(cb)
}

function emit(evt, payload) {
    if (! events[evt] || ! Array.isArray(events[evt])) {
        return
    }

    events[evt].forEach(cb => {
        cb(payload)
    })
}

