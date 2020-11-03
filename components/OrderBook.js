import React from 'react'
import { w3cwebsocket as W3CWebSocket } from "websocket";
import poloniexReader from "../lib/readers/poloniex.ts"
import binanceReader from "../lib/readers/binance.ts"
import styles from './OrderBook.module.scss'
import exchange from '../lib/exchange'

export default class OrderBook extends React.Component {

    constructor(props) {
        super(props)

        this.poloniex = null
        this.binance = null

        this.state = {
            opps: {
                // buy => sells
                poloniex: {},
                binance: {},
            },
            sortedAskPrices: [],
            sortedBidPrices: [],

            askPriceToTotal: {
                poloniex: {},
                binance: {},
            },
            bidPriceToTotal: {
                poloniex: {},
                binance: {},
            },
        }
    }

    handleAsk = (ask, exchange, compareExchange, state) => {
        const newPrices = exchange.insertAskPrice(this.state.sortedAskPrices, ask.price).slice(0, 20)

        const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
        newTotals[compareExchange][ask.price] = {
            exchangeID: compareExchange,
            total: ask.amount,
        }

        this.setState({askPriceToTotal: newTotals})
        this.setState({sortedAskPrices: newPrices})

        const availableLiquidity = parseFloat(ask.amount)

        if (! availableLiquidity) {
            return
        }

        // identify arbitrage opportunities
        {
            const opps = JSON.parse(JSON.stringify(this.state.opps))

            // I can buy at this price w/ this fee:
            const buyPrice = parseFloat(ask.price)
            const buyFee = buyPrice * this.fees[exchange]

            const bidPriceToTotalExchange = this.state.bidPriceToTotal[exchange]

            // we have an "ASK" => an offer to sell
            // look at potential buyers to see if we can profit
            for (const bidPrice in bidPriceToTotalExchange) {

                const desiredLiquidity = parseFloat(bidPriceToTotalExchange[bidPrice].total)

                if (! desiredLiquidity) {
                    continue
                }

                let sellPrice
                {
                    // I can sell at this price w/ this fee:
                    sellPrice = parseFloat(bidPrice)
                    const sellFee = sellPrice * this.fees[compareExchange]
                    const profit = (sellPrice - buyPrice - (buyFee + sellFee))

                    if (profit <= 0) {
                        console.log(`no profit buying from ${exchange} and selling to ${compareExchange}`, profit)
                        continue
                    }
                }

                // we can buy from this exchange and sell to the other one
                if (! opps[exchange][ask.price]) {
                    opps[exchange][ask.price] = {}
                }

                if (! opps[exchange][ask.price][bidPrice]) {
                    opps[exchange][ask.price][bidPrice] = {
                        buy: 0,
                        sell: 0,
                    }
                }

                opps[exchange][ask.price][bidPrice].buy += availableLiquidity
                opps[exchange][ask.price][bidPrice].sell += desiredLiquidity
            }

            this.setState({opps})
        }
    }

    handleBid = (bid, exchange, compareExchange) => {

        const newPrices = exchange.insertBidPrice(this.state.sortedBidPrices, bid.price).slice(0, 20)

        const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
        newTotals[exchange][bid.price] = {
            exchangeID: exchange,
            total: bid.amount,
        }

        this.setState({bidPriceToTotal: newTotals})
        this.setState({sortedBidPrices: newPrices})

        const desiredLiquidity = parseFloat(bid.amount)

        if (! desiredLiquidity) {
            return
        }

        // identify arbitrage opportunities
        {
            const opps = JSON.parse(JSON.stringify(this.state.opps))

            // I need to sell at this price w/ this fee
            const sellPrice = parseFloat(bid.price)
            const exchangeFee = sellPrice * this.fees[exchange]

            // we have a "BID" => an offer to buy
            // look at potential sellers to see if we can profit
            const askPriceToTotalCompare = this.state.askPriceToTotal[compareExchange]

            for (const askPrice in askPriceToTotalCompare) {

                const availableLiquidity = parseFloat(askPriceToTotalCompare[askPrice].total)

                if (! availableLiquidity) {
                    continue
                }

                let buyPrice
                {
                    buyPrice = parseFloat(askPrice)
                    const buyFee = buyPrice * this.fees[compareExchange]
                    const profit = (sellPrice - buyPrice - (exchangeFee + buyFee))

                    if (profit <= 0) {
                        console.log(`no profit buying from ${compareExchange} and selling to ${exchange}`, profit)
                        continue
                    }
                }

                // we can buy from the other exchange and sell to this one
                if (! opps[compareExchange][askPrice]) {
                    opps[compareExchange][askPrice] = {}
                }

                if (! opps[compareExchange][askPrice][bid.price]) {
                    opps[compareExchange][askPrice][bid.price] = {
                        buy: 0,
                        sell: 0,
                    }
                }

                opps[compareExchange][askPrice][bid.price].buy += availableLiquidity
                opps[compareExchange][askPrice][bid.price].sell += desiredLiquidity
            }

            this.setState({opps})
        }
    }

    componentDidMount() {
        this.poloniex = poloniexReader.client()
        this.binance = binanceReader.client()

        // binance handlers
        {
            this.binance.on('bid', bid => {
                exchange.handleBid(bid, 'binance', 'poloniex', this)
            })

            this.binance.on('ask', ask => {
                exchange.handleAsk(ask, 'binance', 'poloniex', this)
            })
        }

        // poloniex handlers
        {
            // initialize the order book
            this.poloniex.on('orderbook', ({sortedAskPrices, sortedBidPrices, askPriceToTotal, bidPriceToTotal}) => {
                // this.setState({sortedAskPrices, sortedBidPrices, askPriceToTotal, bidPriceToTotal})
            })

            // restart to refresh the books
            // this is more reliable than trying to match
            // trades with orders
            this.poloniex.on('trade', trade => {
                // console.log('restarting', trade)
                // this.poloniex.restart(20)
            })

            // this.poloniex.on('data', d => console.log(d))

            this.poloniex.on('error', err => {
                console.error(err.message)
            })

            this.poloniex.on('ask', ask => {
                exchange.handleAsk(ask, 'poloniex', 'binance', this)
            })

            this.poloniex.on('bid', bid => {
                exchange.handleBid(bid, 'poloniex', 'binance', this)
            })
        }

        this.binance.start()

        this.poloniex.start(20)
    }

    checkTotals = () => {
        console.log('asks', this.state.askPriceToTotal)
        console.log('bids', this.state.bidPriceToTotal)
    }

    closeConnection = () => {
        this.poloniex.close()
        this.binance.close()
    }

    render () {

        const asks = this.state.sortedAskPrices.map(p => {

            const poloniexAmount = typeof this.state.askPriceToTotal.poloniex[p] !== 'undefined'
                  ? this.state.askPriceToTotal.poloniex[p].total
                  : 0

            const binanceAmount = typeof this.state.askPriceToTotal.binance[p] !== 'undefined'
                  ? this.state.askPriceToTotal.binance[p].total
                  : 0

            let pAmount = "0.00000000"
            let pTotal = "0.00000000"
            if (poloniexAmount > 0) {
                pAmount = parseFloat(poloniexAmount).toFixed(8)
                pTotal = (parseFloat(p) * pAmount).toFixed(8)
            }

            let bAmount = "0.00000000"
            let bTotal = "0.00000000"
            if (binanceAmount > 0) {
                bAmount = parseFloat(binanceAmount).toFixed(8)
                bTotal = (parseFloat(p) * bAmount).toFixed(8)
            }
            
            return (
                <div className={styles.dashboardRow} key={p.toString()}>
                    <div className={styles.total}>{pTotal}</div>
                    <div className={styles.amount}>{pAmount}</div>
                    <div className={styles.price}>{p}</div>
                    <div className={styles.amount}>{bAmount}</div>
                    <div className={styles.total}>{bTotal}</div>
                </div>
            )

        })

        const bids = this.state.sortedBidPrices.map(p => {
            const poloniexAmount = this.state.bidPriceToTotal.poloniex[p]
                  ? this.state.bidPriceToTotal.poloniex[p].total
                  : 0

            const binanceAmount = this.state.bidPriceToTotal.binance[p]
                  ? this.state.bidPriceToTotal.binance[p].total
                  : 0

            let pAmount = "0.00000000"
            let pTotal = "0.00000000"
            if (poloniexAmount > 0) {
                pAmount = parseFloat(poloniexAmount).toFixed(8)
                pTotal = (parseFloat(p) * pAmount).toFixed(8)
            }

            let bAmount = "0.00000000"
            let bTotal = "0.00000000"
            if (binanceAmount > 0) {
                bAmount = parseFloat(binanceAmount).toFixed(8)
                bTotal = (parseFloat(p) * bAmount).toFixed(8)
            }
            
            return (
                <div className={styles.dashboardRow} key={p.toString()}>
                    <div className={styles.total}>{pTotal}</div>
                    <div className={styles.amount}>{pAmount}</div>
                    <div className={styles.price}>{p}</div>
                    <div className={styles.amount}>{bAmount}</div>
                    <div className={styles.total}>{bTotal}</div>
                </div>
            )
        })

        // key by 
        const buyFromBinancePrices = Object.keys(this.state.opps.binance)
        const buyFromPoloniexPrices = Object.keys(this.state.opps.poloniex)

        const poloniexBuys = buyFromPoloniexPrices.map((buyPrice, i) => {

            const key = buyPrice + i + ""

            const binanceSellPrices = Object.keys(this.state.opps.poloniex[buyPrice])

            const opps = binanceSellPrices.map((sellPrice, i) => {
                const key = sellPrice + i + ""

                const pFee = buyPrice * 0.125
                const bFee = sellPrice * 0.1
                const profit = (sellPrice - buyPrice - (bFee + bFee))

                const profitClass = profit > 0
                      ? 'green'
                      : 'red'

                return (
                    <div className={styles.opp} key={key}>
                        <div>Sell at: {parseFloat(sellPrice)} = Profit <span className={styles[profitClass]}>{profit}</span></div>
                        <div className={styles.oppBuySell}>
                            <div>Buy Amount: {this.state.opps.poloniex[buyPrice][sellPrice].buy}</div>
                            <div>Sell Amount: {this.state.opps.poloniex[buyPrice][sellPrice].sell}</div>
                        </div>
                    </div>
                )
            })

            return (
                <div className={styles.oppGroup} key={key}>
                    <div>Buy From Poloniex at {parseFloat(buyPrice)}</div>
                    {opps}
                </div>
            )
        })

        const binanceBuys = buyFromBinancePrices.map((buyPrice, i) => {

            const key = buyPrice + i + ""

            const poloniexSellPrices = Object.keys(this.state.opps.binance[buyPrice])

            const opps = poloniexSellPrices.map((sellPrice, i) => {
                const key = sellPrice + i + ""

                const bFee = buyPrice * 0.1
                const pFee = sellPrice * 0.125
                const profit = (sellPrice - buyPrice - (bFee + bFee))

                const profitClass = profit > 0
                      ? 'green'
                      : 'red'

                return (
                    <div className={styles.opp} key={key}>
                        <div>Sell at: {parseFloat(sellPrice)} = Profit <span className={styles[profitClass]}>{profit}</span></div>
                        <div className={styles.oppBuySell}>
                            <div>Buy Amount: {this.state.opps.binance[buyPrice][sellPrice].buy}</div>
                            <div>Sell Amount: {this.state.opps.binance[buyPrice][sellPrice].sell}</div>
                        </div>
                    </div>
                )
            })

            return (
                <div className={styles.oppGroup} key={key}>
                    <div>Buy From Binance at {parseFloat(buyPrice)}</div>
                    {opps}
                </div>
            )
        })

        return (
            <div>
                <button onClick={this.closeConnection}>Close</button>
                <button onClick={this.checkTotals}>Check</button>
                <div className={styles.dashboardWrap}>
                    <div className={styles.orderBook}>
                        <div className={styles.dashboardRows}>
                            <h2>Asks</h2>
                            {asks}
                        </div>
                        <div className={styles.dashboardRows}>
                            <h2>Bids</h2>
                            {bids}
                        </div>
                    </div>
                    <div className={styles.console}>
                        <div>{poloniexBuys}</div>
                        <div>{binanceBuys}</div>
                    </div>
                </div>

            </div>
        )
    }
}
