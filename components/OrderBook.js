import React from 'react'
import { w3cwebsocket as W3CWebSocket } from "websocket";
import poloniexReader from "../lib/readers/poloniex.ts"
import binanceReader from "../lib/readers/binance.ts"
import styles from './OrderBook.module.scss'
import prices from '../lib/prices'

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

    // https://docs.poloniex.com/#price-aggregated-book
    componentDidMount() {
        this.poloniex = poloniexReader.client()
        this.binance = binanceReader.client()

        // binance handlers
        {
            // this.binance.on('data', d => console.log('BINANE>>>>', d))

            this.binance.on('bid', bid => {

                const newPrices = prices.insertBidPrice(this.state.sortedBidPrices, bid.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.binance[bid.price] = {
                    exchangeID: 'binance',
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

                    const sellPrice = parseFloat(bid.price)
                    const binanceFee = sellPrice * 0.1

                    for (const askPrice in this.state.askPriceToTotal.poloniex) {

                        const availableLiquidity = parseFloat(this.state.askPriceToTotal.poloniex[askPrice].total)

                        if (! availableLiquidity) {
                            continue
                        }

                        let buyPrice
                        {
                            buyPrice = parseFloat(askPrice)
                            const poloniexFee = buyPrice * 0.125
                            const profit = (sellPrice - buyPrice - (binanceFee + poloniexFee))

                            if (profit <= 0) {
                                console.log('no profit', profit)
                                continue
                            }
                        }

                        if (! opps.poloniex[askPrice]) {
                            opps.poloniex[askPrice] = {}
                        }

                        if (! opps.poloniex[askPrice][bid.price]) {
                            opps.poloniex[askPrice][bid.price] = {
                                buy: 0,
                                sell: 0,
                            }
                        }

                        opps.poloniex[askPrice][bid.price].buy += availableLiquidity
                        opps.poloniex[askPrice][bid.price].sell += desiredLiquidity
                    }

                    this.setState({opps})
                }
            })

            this.binance.on('ask', ask => {

                const newPrices = prices.insertAskPrice(this.state.sortedAskPrices, ask.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.binance[ask.price] = {
                    exchangeID: 'binance',
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

                    const buyPrice = parseFloat(ask.price)
                    const binanceFee = buyPrice * 0.1

                    for (const bidPrice in this.state.bidPriceToTotal.poloniex) {

                        const desiredLiquidity = parseFloat(this.state.bidPriceToTotal.poloniex[bidPrice].total)

                        if (! desiredLiquidity) {
                            continue
                        }

                        let sellPrice
                        {
                            sellPrice = parseFloat(bidPrice)
                            const poloniexFee = sellPrice * 0.125
                            const profit = (sellPrice - buyPrice - (binanceFee + poloniexFee))

                            if (profit <= 0) {
                                console.log('no profit', profit)
                                continue
                            }
                        }

                        if (! opps.binance[ask.price]) {
                            opps.binance[ask.price] = {}
                        }

                        if (! opps.binance[ask.price][bidPrice]) {
                            opps.binance[ask.price][bidPrice] = {
                                buy: 0,
                                sell: 0,
                            }
                        }

                        opps.binance[ask.price][bidPrice].buy += availableLiquidity
                        opps.binance[ask.price][bidPrice].sell += desiredLiquidity
                    }

                    this.setState({opps})
                }
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

                const newPrices = prices.insertAskPrice(this.state.sortedAskPrices, ask.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.poloniex[ask.price] = {
                    exchangeID: 'poloniex',
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

                    const buyPrice = parseFloat(ask.price)
                    const poloniexFee = buyPrice * 0.125

                    for (const bidPrice in this.state.bidPriceToTotal.binance) {

                        const desiredLiquidity = parseFloat(this.state.bidPriceToTotal.binance[bidPrice].total)

                        if (! desiredLiquidity) {
                            continue
                        }

                        let sellPrice
                        {
                            sellPrice = parseFloat(bidPrice)
                            const binanceFee = sellPrice * 0.1
                            const profit = (sellPrice - buyPrice - (binanceFee + poloniexFee))

                            if (profit <= 0) {
                                console.log('no profit', profit)
                                continue
                            }
                        }

                        if (! opps.poloniex[ask.price]) {
                            opps.poloniex[ask.price] = {}
                        }

                        if (! opps.poloniex[ask.price][bidPrice]) {
                            opps.poloniex[ask.price][bidPrice] = {
                                buy: 0,
                                sell: 0,
                            }
                        }

                        opps.poloniex[ask.price][bidPrice].buy += availableLiquidity
                        opps.poloniex[ask.price][bidPrice].sell += desiredLiquidity
                    }

                    this.setState({opps})
                }
            })

            this.poloniex.on('bid', bid => {
                const newPrices = prices.insertBidPrice(this.state.sortedBidPrices, bid.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.poloniex[bid.price] = {
                    exchangeID: 'poloniex',
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

                    const sellPrice = parseFloat(bid.price)
                    const poloniexFee = sellPrice * 0.125

                    for (const askPrice in this.state.askPriceToTotal.binance) {

                        const availableLiquidity = parseFloat(this.state.askPriceToTotal.binance[askPrice].total)

                        if (! availableLiquidity) {
                            continue
                        }

                        let buyPrice
                        {
                            buyPrice = parseFloat(askPrice)
                            const binanceFee = buyPrice * 0.1
                            const profit = (sellPrice - buyPrice - (binanceFee + poloniexFee))

                            if (profit <= 0) {
                                console.log('no profit', profit)
                                continue
                            }
                        }

                        if (! opps.binance[askPrice]) {
                            opps.binance[askPrice] = {}
                        }

                        if (! opps.binance[askPrice][bid.price]) {
                            opps.binance[askPrice][bid.price] = {
                                buy: 0,
                                sell: 0,
                            }
                        }

                        opps.binance[askPrice][bid.price].buy += availableLiquidity
                        opps.binance[askPrice][bid.price].sell += desiredLiquidity
                    }

                    this.setState({opps})
                }
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
