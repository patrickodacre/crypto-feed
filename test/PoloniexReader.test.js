const assert = require('assert')
import poloniex_reader from '../lib/readers/poloniex'
import exchange from '../lib/exchange'

describe('Poloniex Reader', () => {
    let orderBookMessage = []
    let bids = []
    let asks = []
    let sales = []
    let buys = []

    beforeEach(() => {
        orderBookMessage = [
            148, // id
            89123812093, // sequence
            [
                [
                    "i",
                    {
                        currencyPair: "BTC_ETH",
                        orderBook: [
                            //asks
                            {
                                "0.02847791": "66.04957068",
                                "0.02847792": "23.40000000",
                                "0.02848581": "0.60024480",
                                "0.02848582": "10.00000000",
                                "0.02848661": "0.68655000",
                            },
                            // bids
                            // BTC : ETH
                            {
                                "0.02847791": "20.0000000",
                                "0.02840000": "1117263.00000000",
                                "0.02840001": "505050.00000000",
                                "0.02840002": "200000.00000000",
                                "0.02840003": "111000.00000000",
                                "0.02840004": "50000.00000000",
                                "0.02840005": "25000.00000000",
                                "0.02840006": "557.96296296",
                                "0.02840007": "12500.00000000",
                            },
                        ]
                    },
                ],
            ]
        ]

        bids = [
            148, // id
            89123812093, // sequence
            [
                [
                    "o",
                    1, // bid
                    "0.02840000", // price
                    "1.00000000", // size
                ],
                [
                    "o",
                    1, // bid
                    "0.02840001", // price
                    "1.00000000", // size
                ],
            ]
        ]

        asks = [
            148, // id
            89123812094, // sequence
            [
                [
                    "o",
                    0, // ask
                    "0.02847791", // price
                    "10.1", // size
                ],
                [
                    "o",
                    0, // ask
                    "0.02847792", // price
                    "10.1", // size
                ],
            ]
        ]

        sales = [
            148, // id
            89123812095, // sequence
            [
                [
                    "t", // trade
                    "29912309812", // id
                    0, // sell
                    "0.02847791", // price
                    "1.00000000", // amount of ETH sold
                ],
            ]
        ]

        buys = [
            148, // id
            89123812095, // sequence
            [
                [
                    "t",
                    "29912309813", // id
                    1, // buy
                    "0.02847792", // price
                    "0.21195285", // amount of ETH purchased
                ],
            ]
        ]
    })

    describe('exchange.js', () => {
        it('should add a new bid to an descending list of bids', () => {

            const a = [6,5,4,2,1]

            const b = exchange.insertBidPrice(a, 3)

            assert.equal(b[3], 3)
        })

        it('should add a new ask to an ascending list of asks', () => {

            const a = [1,2,4,5,6]

            const b = exchange.insertAskPrice(a, 3)

            assert.equal(b[2], 3)
        })

        it('should not falsely report opportunities to profit from new bids', () => {

            const bids = [
                {
                    exchangeID: 'poloniex',
                    transaction: 'order',
                    type: 'bid',
                    price: "0.02740000",
                    amount: "10.00000000",
                }
            ]

            const askPriceToTotal = {
                bittrex: {
                    "0.02740000": {
                        total: "10.00000000",
                        exchangeID: "bittrex",
                    }
                }
            }

            // console.log('check', desiredLiquidity)
            const [o, ok] = exchange.arbitrageBid(bids[0], 'poloniex', askPriceToTotal.bittrex, 'bittrex')

            assert.equal(ok, false)
        })

        it('should not falsely report opportunities to profit from new asks', () => {
            const asks = [
                {
                    exchangeID: 'poloniex',
                    transaction: 'order',
                    type: 'ask',
                    price: "0.02740000",
                    amount: "10.00000000",
                }
            ]

            const bidPriceToTotal = {
                bittrex: {
                    "0.02740000": {
                        total: "10.00000000",
                        exchangeID: "bittrex",
                    }
                }
            }

            // console.log('check', desiredLiquidity)
            const [o, ok] = exchange.arbitrageAsk(asks[0], 'poloniex', bidPriceToTotal.bittrex, 'bittrex')

            assert.equal(ok, false)
        })

        it('should identify opportunities to profit from new asks', () => {

            const asks = [
                {
                    exchangeID: 'poloniex',
                    transaction: 'order',
                    type: 'ask',
                    price: "0.02000000",
                    amount: "10.00000000",
                }
            ]

            const bidPriceToTotal = {
                bittrex: {
                    "0.02740000": {
                        total: "8.00000000",
                        exchangeID: "bittrex",
                    }
                }
            }

            // console.log('check', desiredLiquidity)
            const [o, ok] = exchange.arbitrageAsk(asks[0], 'poloniex', bidPriceToTotal.bittrex, 'bittrex')

            assert.equal(ok, true)

            assert.equal(o.poloniex["0.02000000"]["0.02740000"].buy, "10.00000000")
            assert.equal(o.poloniex["0.02000000"]["0.02740000"].sell, "8.00000000")

        })

        it('should identify opportunities to profit from new bids', () => {

            const bids = [
                {
                    exchangeID: 'poloniex',
                    transaction: 'order',
                    type: 'bid',
                    price: "0.02740000",
                    amount: "8.00000000",
                }
            ]

            const askPriceToTotal = {
                bittrex: {
                    "0.02000000": {
                        total: "10.00000000",
                        exchangeID: "bittrex",
                    }
                }
            }

            // console.log('check', desiredLiquidity)
            const [o, ok] = exchange.arbitrageBid(bids[0], 'poloniex', askPriceToTotal.bittrex, 'bittrex')

            assert.equal(ok, true)

            assert.equal(o.bittrex["0.02000000"]["0.02740000"].buy, "10.00000000")
            assert.equal(o.bittrex["0.02000000"]["0.02740000"].sell, "8.00000000")
        })
    })

    describe('reader', () => {

        it('should create reader', () => {
            const client = poloniex_reader.client()

            assert.equal(client.hasOwnProperty('start'), true)
            assert.equal(client.hasOwnProperty('close'), true)
            assert.equal(client.hasOwnProperty('read'), true)
            assert.equal(client.hasOwnProperty('on'), true)
        })

        it('should send bids with the correct properties', () => {
            const client = poloniex_reader.client()

            client.on('bid', bid => {
                assert.equal(bid.hasOwnProperty('exchangeID'), true, "exchange ID missing")
                assert.equal(bid.hasOwnProperty('transaction'), true, "transaction missing")
                assert.equal(bid.hasOwnProperty('type'), true, "type missing")
                assert.equal(bid.hasOwnProperty('price'), true, "price missing")
                assert.equal(bid.hasOwnProperty('amount'), true, "amount missing")
            })

            client.read(bids)
        })

        it('should send asks with the correct properties', () => {
            const client = poloniex_reader.client()

            client.on('ask', ask => {
                assert.equal(ask.hasOwnProperty('exchangeID'), true, "exchange ID missing")
                assert.equal(ask.hasOwnProperty('transaction'), true, "transaction missing")
                assert.equal(ask.hasOwnProperty('type'), true, "type missing")
                assert.equal(ask.hasOwnProperty('price'), true, "price missing")
                assert.equal(ask.hasOwnProperty('amount'), true, "amount missing")
            })

            client.read(asks)
        })

        it('should send sells with the correct properties', () => {
            const client = poloniex_reader.client()

            client.on('sell', sell => {
                assert.equal(sell.hasOwnProperty('exchangeID'), true, "exchange ID missing")
                assert.equal(sell.hasOwnProperty('tradeID'), true, "trade id missing")
                assert.equal(sell.hasOwnProperty('transaction'), true, "transaction missing")
                assert.equal(sell.hasOwnProperty('type'), true, "type missing")
                assert.equal(sell.hasOwnProperty('price'), true, "price missing")
                assert.equal(sell.hasOwnProperty('amount'), true, "amount missing")
                assert.equal(sell.hasOwnProperty('timestamp'), true, "timestamp missing")
            })

            client.read(sales)
        })

        it('should send buys with the correct properties', () => {
            const client = poloniex_reader.client()

            client.on('buy', buy => {
                assert.equal(buy.hasOwnProperty('exchangeID'), true, "exchange ID missing")
                assert.equal(buy.hasOwnProperty('tradeID'), true, "trade id missing")
                assert.equal(buy.hasOwnProperty('transaction'), true, "transaction missing")
                assert.equal(buy.hasOwnProperty('type'), true, "type missing")
                assert.equal(buy.hasOwnProperty('price'), true, "price missing")
                assert.equal(buy.hasOwnProperty('amount'), true, "amount missing")
                assert.equal(buy.hasOwnProperty('timestamp'), true, "timestamp missing")
            })

            client.read(buys)
        })

        it('should emit bids', done => {
            const client = poloniex_reader.client()
            let called = false

            client.on('bid', bid => {
                if (! called) done()

                called = true
            })

            client.read(bids)
        })

        it('should emit asks', done => {
            const client = poloniex_reader.client()
            let called = false

            client.on('ask', ask => {
                if (! called) done()

                called = true
            })

            client.read(asks)
        })

        it('should emit buys', done => {
            const client = poloniex_reader.client()
            let called = false

            client.on('buy', buy => {
                if (! called) done()

                called = true
            })

            client.read(buys)
        })

        it('should emit sells', done => {
            const client = poloniex_reader.client()
            let called = false

            client.on('sell', sell => {
                if (! called) done()

                called = true
            })

            client.read(sales)
        })
    })
})
