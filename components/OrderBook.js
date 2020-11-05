import React from 'react'
import { w3cwebsocket as W3CWebSocket } from "websocket";
import poloniexReader from "../lib/readers/poloniex.ts"
import binanceReader from "../lib/readers/binance.ts"
import bittrexReader from "../lib/readers/bittrex.ts"
import styles from './OrderBook.module.scss'
import exchange from '../lib/exchange.ts'

export default class OrderBook extends React.Component {

    constructor(props) {
        super(props)

        this.poloniex = null
        this.binance = null
        this.bittrex = null

        this.state = {
            opps: {
                // buy => sells
                poloniex: {},
                binance: {},
                bittrex: {},
            },
            sortedAskPrices: [],
            sortedBidPrices: [],

            askPriceToTotal: {
                poloniex: {},
                binance: {},
                bittrex: {},
            },
            bidPriceToTotal: {
                poloniex: {},
                binance: {},
                bittrex: {},
            },
        }
    }

    componentDidMount() {
        this.poloniex = poloniexReader.client()
        this.binance = binanceReader.client()
        this.bittrex = bittrexReader.client()

        // bittrex handlers
        {
            this.bittrex.on('bid', bid => {

                const newPrices = exchange.insertBidPrice(this.state.sortedBidPrices, bid.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.bittrex[bid.price] = {
                    exchangeID: 'bittrex',
                    total: bid.amount,
                }

                this.setState({bidPriceToTotal: newTotals})
                this.setState({sortedBidPrices: newPrices})

                const [o, ok] = exchange.arbitrageBid(bid, 'bittrex', this.state.askPriceToTotal.poloniex, 'poloniex')

                if (! ok) {
                    return
                }

                this.setState({opps: {...this.state.opps, ...{bittrex: o}}})
            })

            this.bittrex.on('ask', ask => {
                const newPrices = exchange.insertAskPrice(this.state.sortedAskPrices, ask.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.bittrex[ask.price] = {
                    exchangeID: 'bittrex',
                    total: ask.amount,
                }

                this.setState({askPriceToTotal: newTotals})
                this.setState({sortedAskPrices: newPrices})

                const [o, ok] = exchange.arbitrageAsk(ask, 'bittrex', this.state.bidPriceToTotal.poloniex, 'poloniex')

                if (! ok) {
                    return
                }

                this.setState({opps: {...this.state.opps, ...{bittrex: o}}})
            })
        }

        // binance handlers
        {
            this.binance.on('bid', bid => {
                const newPrices = exchange.insertBidPrice(this.state.sortedBidPrices, bid.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.binance[bid.price] = {
                    exchangeID: 'binance',
                    total: bid.amount,
                }

                this.setState({bidPriceToTotal: newTotals})
                this.setState({sortedBidPrices: newPrices})

                const [o, ok] = exchange.arbitrageBid(bid, 'binance', this.state.askPriceToTotal.poloniex, 'poloniex')

                if (! ok) {
                    return
                }

                this.setState({opps: {...this.state.opps, ...{binance: o}}})
            })

            this.binance.on('ask', ask => {

                const newPrices = exchange.insertAskPrice(this.state.sortedAskPrices, ask.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.binance[ask.price] = {
                    exchangeID: 'binance',
                    total: ask.amount,
                }

                this.setState({askPriceToTotal: newTotals})
                this.setState({sortedAskPrices: newPrices})

                const [o, ok] = exchange.arbitrageAsk(ask, 'binance', this.state.bidPriceToTotal.poloniex, 'poloniex')

                if (! ok) {
                    return
                }

                this.setState({opps: {...this.state.opps, ...{binance: o}}})
            })
        }

        // poloniex handlers
        {
            this.poloniex.on('trade', trade => {
                // console.log('restarting', trade)
                // this.poloniex.restart(20)
            })

            // this.poloniex.on('data', d => console.log(d))

            this.poloniex.on('error', err => {
                console.error(err.message)
            })

            this.poloniex.on('ask', ask => {
                const newPrices = exchange.insertAskPrice(this.state.sortedAskPrices, ask.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.poloniex[ask.price] = {
                    exchangeID: 'poloniex',
                    total: ask.amount,
                }

                this.setState({askPriceToTotal: newTotals})
                this.setState({sortedAskPrices: newPrices})

                const [o, ok] = exchange.arbitrageAsk(ask, 'poloniex', this.state.bidPriceToTotal.binance, 'binance')

                if (! ok) {
                    return
                }

                this.setState({opps: {...this.state.opps, ...{poloniex: o}}})
            })

            this.poloniex.on('bid', bid => {
                const newPrices = exchange.insertBidPrice(this.state.sortedBidPrices, bid.price).slice(0, 20)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.poloniex[bid.price] = {
                    exchangeID: 'poloniex',
                    total: bid.amount,
                }

                this.setState({bidPriceToTotal: newTotals})
                this.setState({sortedBidPrices: newPrices})

                const [o, ok] = exchange.arbitrageBid(bid, 'poloniex', this.state.askPriceToTotal.binance, 'binance')

                if (! ok) {
                    return
                }

                this.setState({opps: {...this.state.opps, ...{poloniex: o}}})
            })

        }

        this.bittrex.start()
        // this.binance.start()
        this.poloniex.start()
    }

    checkTotals = () => {
        console.log('asks', this.state.askPriceToTotal)
        console.log('bids', this.state.bidPriceToTotal)
    }

    closeConnection = () => {
        this.poloniex.close()
        this.binance.close()
        this.bittrex.close()
    }

    render () {

        // Order Book
        const asks = this.state.sortedAskPrices.map(p => {

            const poloniexAmount = typeof this.state.askPriceToTotal.poloniex[p] !== 'undefined'
                  ? this.state.askPriceToTotal.poloniex[p].total
                  : 0

            // const binanceAmount = typeof this.state.askPriceToTotal.binance[p] !== 'undefined'
                  // ? this.state.askPriceToTotal.binance[p].total
                  // : 0

            const bittrexAmount = typeof this.state.askPriceToTotal.bittrex[p] !== 'undefined'
                  ? this.state.askPriceToTotal.bittrex[p].total
                  : 0

            let pAmount = "0.00000000"
            let pTotal = "0.00000000"
            if (poloniexAmount > 0) {
                pAmount = parseFloat(poloniexAmount).toFixed(8)
                pTotal = (parseFloat(p) * pAmount).toFixed(8)
            }

            // let bAmount = "0.00000000"
            // let bTotal = "0.00000000"
            // if (binanceAmount > 0) {
                // bAmount = parseFloat(binanceAmount).toFixed(8)
                // bTotal = (parseFloat(p) * bAmount).toFixed(8)
            // }

            let bitAmount = "0.00000000"
            let bitTotal = "0.00000000"
            if (bittrexAmount > 0) {
                bitAmount = parseFloat(bittrexAmount).toFixed(8)
                bitTotal = (parseFloat(p) * bitAmount).toFixed(8)
            }


            // <div className={styles.amount}>{bAmount}</div>
            // <div className={styles.total}>{bTotal}</div>

            return (
                <div className={styles.dashboardRow} key={p.toString()}>
                    <div className={styles.total}>{pTotal}</div>
                    <div className={styles.amount}>{pAmount}</div>
                    <div className={styles.price}>{p}</div>
                    <div className={styles.amount}>{bitAmount}</div>
                    <div className={styles.total}>{bitTotal}</div>
                </div>
            )

        })

        const bids = this.state.sortedBidPrices.map(p => {

            const poloniexAmount = this.state.bidPriceToTotal.poloniex[p]
                  ? this.state.bidPriceToTotal.poloniex[p].total
                  : 0

            // const binanceAmount = this.state.bidPriceToTotal.binance[p]
                  // ? this.state.bidPriceToTotal.binance[p].total
                  // : 0

            const bittrexAmount = this.state.bidPriceToTotal.bittrex[p]
                  ? this.state.bidPriceToTotal.bittrex[p].total
                  : 0

            let pAmount = "0.00000000"
            let pTotal = "0.00000000"
            if (poloniexAmount > 0) {
                pAmount = parseFloat(poloniexAmount).toFixed(8)
                pTotal = (parseFloat(p) * pAmount).toFixed(8)
            }

            // let bAmount = "0.00000000"
            // let bTotal = "0.00000000"
            // if (binanceAmount > 0) {
                // bAmount = parseFloat(binanceAmount).toFixed(8)
                // bTotal = (parseFloat(p) * bAmount).toFixed(8)
            // }

            let bitAmount = "0.00000000"
            let bitTotal = "0.00000000"
            if (bittrexAmount > 0) {
                bitAmount = parseFloat(bittrexAmount).toFixed(8)
                bitTotal = (parseFloat(p) * bitAmount).toFixed(8)
            }

            // <div className={styles.amount}>{bAmount}</div>
            // <div className={styles.total}>{bTotal}</div>

            return (
                <div className={styles.dashboardRow} key={p.toString()}>
                    <div className={styles.total}>{pTotal}</div>
                    <div className={styles.amount}>{pAmount}</div>
                    <div className={styles.price}>{p}</div>
                    <div className={styles.amount}>{bitAmount}</div>
                    <div className={styles.total}>{bitTotal}</div>
                </div>
            )
        })

        // Arbitrage Opportunities
        const buyFromBinancePrices = Object.keys(this.state.opps.binance)
        const buyFromPoloniexPrices = Object.keys(this.state.opps.poloniex)
        const buyFromBittrexPrices = Object.keys(this.state.opps.bittrex)

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

        const bittrexBuys = buyFromBittrexPrices.map((buyPrice, i) => {

            const key = buyPrice + i + ""

            const poloniexSellPrices = Object.keys(this.state.opps.bittrex[buyPrice])

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
                            <div>Buy Amount: {this.state.opps.bittrex[buyPrice][sellPrice].buy}</div>
                            <div>Sell Amount: {this.state.opps.bittrex[buyPrice][sellPrice].sell}</div>
                        </div>
                    </div>
                )
            })

            return (
                <div className={styles.oppGroup} key={key}>
                    <div>Buy From Bittrex at {parseFloat(buyPrice)}</div>
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
                            <div className={styles.titles}>
                                <div>Poloniex</div>
                                <div>Bittrex</div>
                            </div>
                            <div className={styles.rowHeader}>
                                <div>Total BTC</div>
                                <div>Liquidity</div>
                                <div>Price</div>
                                <div>Liquidity</div>
                                <div>Total BTC</div>
                            </div>
                            {asks}
                        </div>

                        <div className={styles.dashboardRows}>
                            <h2>Bids</h2>
                            <div className={styles.titles}>
                                <div>Poloniex</div>
                                <div>Bittrex</div>
                            </div>
                            <div className={styles.rowHeader}>
                                <div>Total BTC</div>
                                <div>Liquidity</div>
                                <div>Price</div>
                                <div>Liquidity</div>
                                <div>Total BTC</div>
                            </div>

                            {bids}
                        </div>
                    </div>
                    <div className={styles.console}>
                        <div>{poloniexBuys}</div>
                        <div>{binanceBuys}</div>
                        <div>{bittrexBuys}</div>
                    </div>
                </div>

            </div>
        )
    }
}
