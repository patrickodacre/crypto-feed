import { w3cwebsocket as W3CWebSocket } from "websocket";

// Poloniex Reader
export default {
    client,
}

const events = {}
let _client = null

function client() {
    _client = new W3CWebSocket('wss://api2.poloniex.com')

    return {
        provider,
        updatePriceToTotal,
        read,
        start,
        close,

        // data, heartbeat, update, bid, ask, sell, buy, orderbook, error
        on,
    }
}

// start begins reading the WS stream.
function start() {
    _client.onopen = () => {
        console.log('ws open')

        _client.send(JSON.stringify({"command": "subscribe", "channel": "BTC_ETH"}))
    }

    _client.onmessage = ({data}) => {
        read(JSON.parse(data))
    }
}

// _read returns [data, error]
function read(data) {

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

        // asks
        if (orderBook[0]) {

            for (const price in orderBook[0]) {
                const amount = orderBook[0][price]

                totals.askPriceToTotal = updatePriceToTotal(totals.askPriceToTotal, price, amount)
            }

            totals.sortedAskPrices = Object.keys(totals.askPriceToTotal).sort()
        }

        // bids
        if (orderBook[1]) {

            for (const price in orderBook[1]) {
                const amount = orderBook[1][price]

                totals.bidPriceToTotal = updatePriceToTotal(totals.bidPriceToTotal, price, amount)
            }

            totals.sortedBidPrices = Object.keys(totals.bidPriceToTotal).sort()
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
            if (type === 0) {
                emit('ask', {
                    transaction: 'order',
                    type: 'ask',
                    price,
                    amount: parseFloat(amount),
                })
            }

            // bid
            if (type === 1) {
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
            if (type === 0) {
                emit('sell', {
                    id,
                    transaction: 'trade',
                    type: 'sell',
                    price,
                    amount: parseFloat(amount),
                    timestamp,
                })
            }

            // buy
            if (type === 1) {
                emit('buy', {
                    id,
                    transaction: 'trade',
                    type: 'buy',
                    price,
                    amount: parseFloat(amount),
                    timestamp,
                })
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

    t[price] += parseFloat(amount)

    return t
}

// close terminates the WS connection
function close() {
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

