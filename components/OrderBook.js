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
            matches: {
                bittrex: {},
                poloniex: {},
            },
            checks: {
                poloniex: {},
                bittrex: {},
            },
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

                const newPrices = exchange.insertBidPrice(this.state.sortedBidPrices, bid.price)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.bittrex[bid.price] = {
                    exchangeID: 'bittrex',
                    total: bid.amount,
                }

                this.setState({bidPriceToTotal: newTotals})
                this.setState({sortedBidPrices: newPrices})

                const [poloniexBuyOpp, ok, empty] = exchange.arbitrageBid(bid, 'bittrex', this.state.askPriceToTotal.poloniex, 'poloniex')

                if (ok) {
                    this.setState({opps: {...this.state.opps, ...{poloniex: poloniexBuyOpp.poloniex}}})
                } else if (! empty) {
                    this.setState({checks: {...this.state.checks, ...{poloniex: poloniexBuyOpp.poloniex}}})
                }

                // check for matches
                // matches don't offer an opportunity to profit;
                // you have to take exchange fees into account.
                const matches = exchange.matchBidToAsk(bid, 'poloniex', this.state.askPriceToTotal.poloniex)
                this.setState({...this.state.matches, ...matches})
            })

            this.bittrex.on('ask', ask => {
                const newPrices = exchange.insertAskPrice(this.state.sortedAskPrices, ask.price)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.bittrex[ask.price] = {
                    exchangeID: 'bittrex',
                    total: ask.amount,
                }

                this.setState({askPriceToTotal: newTotals})
                this.setState({sortedAskPrices: newPrices})

                const [bittrexBuyOpp, ok, empty] = exchange.arbitrageAsk(ask, 'bittrex', this.state.bidPriceToTotal.poloniex, 'poloniex')
                if (ok) {
                    this.setState({opps: {...this.state.opps, ...{bittrex: bittrexBuyOpp.bittrex}}})
                } else if (! empty) {
                    this.setState({checks: {...this.state.checks, ...{bittrex: bittrexBuyOpp.bittrex}}})
                }

                // selling on bittrex => buying on poloniex?
                const matches = exchange.matchAskToBid(ask, 'bittrex', this.state.bidPriceToTotal.poloniex)
                this.setState({...this.state.matches, ...matches})
            })
        }

        // binance handlers
        {
            this.binance.on('bid', bid => {
                const newPrices = exchange.insertBidPrice(this.state.sortedBidPrices, bid.price)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.binance[bid.price] = {
                    exchangeID: 'binance',
                    total: bid.amount,
                }

                this.setState({bidPriceToTotal: newTotals})
                this.setState({sortedBidPrices: newPrices})

                const [o, ok] = exchange.arbitrageBid(bid, 'binance', this.state.askPriceToTotal.poloniex, 'poloniex')

                console.log('Arbitrage Opportunity on Bid?', ok)
                console.log('data -- ', o)

                if (ok) {
                    this.setState({opps: {...this.state.opps, ...{binance: o}}})
                }
            })

            this.binance.on('ask', ask => {

                const newPrices = exchange.insertAskPrice(this.state.sortedAskPrices, ask.price)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.binance[ask.price] = {
                    exchangeID: 'binance',
                    total: ask.amount,
                }

                this.setState({askPriceToTotal: newTotals})
                this.setState({sortedAskPrices: newPrices})

                const [o, ok] = exchange.arbitrageAsk(ask, 'binance', this.state.bidPriceToTotal.poloniex, 'poloniex')

                console.log('Arbitrage Opportunity on Ask?', ok)
                console.log('data -- ', o)

                if (ok) {
                    this.setState({opps: {...this.state.opps, ...{binance: o}}})
                }
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
                const newPrices = exchange.insertAskPrice(this.state.sortedAskPrices, ask.price)

                const newTotals = JSON.parse(JSON.stringify(this.state.askPriceToTotal))
                newTotals.poloniex[ask.price] = {
                    exchangeID: 'poloniex',
                    total: ask.amount,
                }

                this.setState({askPriceToTotal: newTotals})
                this.setState({sortedAskPrices: newPrices})

                const [poloniexBuyOpp, ok, empty] = exchange.arbitrageAsk(ask, 'poloniex', this.state.bidPriceToTotal.bittrex, 'bittrex')

                if (ok) {
                    this.setState({opps: {...this.state.opps, ...{poloniex: poloniexBuyOpp.poloniex}}})
                } else if (! empty) {
                    this.setState({checks: {...this.state.checks, ...{poloniex: poloniexBuyOpp.poloniex}}})
                }

                // selling on poloniex => buyers on bittrex?
                const matches = exchange.matchAskToBid(ask, 'poloniex', this.state.bidPriceToTotal.bittrex)
                this.setState({...this.state.matches, ...matches})
            })

            this.poloniex.on('bid', bid => {
                const newPrices = exchange.insertBidPrice(this.state.sortedBidPrices, bid.price)

                const newTotals = JSON.parse(JSON.stringify(this.state.bidPriceToTotal))
                newTotals.poloniex[bid.price] = {
                    exchangeID: 'poloniex',
                    total: bid.amount,
                }

                this.setState({bidPriceToTotal: newTotals})
                this.setState({sortedBidPrices: newPrices})

                const [bittrexBuyOpp, ok, empty] = exchange.arbitrageBid(bid, 'poloniex', this.state.askPriceToTotal.bittrex, 'bittrex')

                if (ok) {
                    this.setState({opps: {...this.state.opps, ...{bittrex: bittrexBuyOpp.bittrex}}})
                } else if (! empty) {
                    this.setState({checks: {...this.state.checks, ...{bittrex: bittrexBuyOpp.bittrex}}})
                }

                // buying on Poloniex => selling on Bittrex?
                const matches = exchange.matchBidToAsk(bid, 'bittrex', this.state.askPriceToTotal.bittrex)
                this.setState({...this.state.matches, ...matches})
            })

        }

        this.bittrex.start()
        // this.binance.start()
        this.poloniex.start()
    }

    closeConnection = () => {
        this.poloniex.close()
        this.binance.close()
        this.bittrex.close()
    }

    render () {

        // Order Book
        const asks = this.state.sortedAskPrices
        .filter(p => {
            const poloniexLiquidity = this.state.askPriceToTotal.poloniex[p]
                ? parseFloat(this.state.askPriceToTotal.poloniex[p].total)
                : 0
            const bittrexLiquidity = this.state.askPriceToTotal.bittrex[p]
                ? parseFloat(this.state.askPriceToTotal.bittrex[p].total)
                : 0

            return poloniexLiquidity > 0 || bittrexLiquidity > 0
        })
        .slice(0, 25)
        .map(p => {

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
                    <div className={styles.total_1}>{pTotal}</div>
                    <div className={styles.amount_1}>{pAmount}</div>
                    <div className={styles.price}>{p}</div>
                    <div className={styles.amount_2}>{bitAmount}</div>
                    <div className={styles.total_2}>{bitTotal}</div>
                </div>
            )

        })

        const bids = this.state.sortedBidPrices
        .filter(p => {
            const poloniexLiquidity = this.state.bidPriceToTotal.poloniex[p]
                ? parseFloat(this.state.bidPriceToTotal.poloniex[p].total)
                : 0
            const bittrexLiquidity = this.state.bidPriceToTotal.bittrex[p]
                ? parseFloat(this.state.bidPriceToTotal.bittrex[p].total)
                : 0

            return poloniexLiquidity > 0 || bittrexLiquidity > 0
        })
        .slice(0, 25)
        .map(p => {

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
                    <div className={styles.total_1}>{pTotal}</div>
                    <div className={styles.amount_1}>{pAmount}</div>
                    <div className={styles.price}>{p}</div>
                    <div className={styles.amount_2}>{bitAmount}</div>
                    <div className={styles.total_2}>{bitTotal}</div>
                </div>
            )
        })

        // Arbitrage Opportunities
        const buyFromBinancePrices = Object.keys(this.state.opps.binance)
        const buyFromPoloniexPrices = Object.keys(this.state.opps.poloniex)
        const buyFromBittrexPrices = Object.keys(this.state.opps.bittrex)

        // checks for POLONIEX and BITTREX
        let checksPoloniex = Object.keys(this.state.checks.poloniex)

        if (checksPoloniex.length > 10) {
            checksPoloniex = checksPoloniex.slice(0,10)
        }

        const poloniexChecks = checksPoloniex.map((buyPrice, i) => {

            const key = buyPrice + i + ""

            const bittrexSellPrices = Object.keys(this.state.checks.poloniex[buyPrice])

            const checks = bittrexSellPrices.map((sellPrice, i) => {
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
                            <div>Buy Amount: {this.state.checks.poloniex[buyPrice][sellPrice].buy}</div>
                            <div>Sell Amount: {this.state.checks.poloniex[buyPrice][sellPrice].sell}</div>
                        </div>
                    </div>
                )
            })

            return (
                <div className={styles.oppGroup} key={key}>
                    <div>Check Buy From Poloniex at {parseFloat(buyPrice)}</div>
                    {checks}
                </div>
            )
        })

        let checksBittrex = Object.keys(this.state.checks.bittrex)

        if (checksBittrex.length > 10) {
            checksBittrex = checksBittrex.slice(0,10)
        }

        const bittrexChecks = checksBittrex.map((buyPrice, i) => {

            const key = buyPrice + i + ""

            const poloniexSellPrices = Object.keys(this.state.checks.bittrex[buyPrice])

            const checks = poloniexSellPrices.map((sellPrice, i) => {
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
                            <div>Buy Amount: {this.state.checks.bittrex[buyPrice][sellPrice].buy}</div>
                            <div>Sell Amount: {this.state.checks.bittrex[buyPrice][sellPrice].sell}</div>
                        </div>
                    </div>
                )
            })

            return (
                <div className={styles.oppGroup} key={key}>
                    <div>Check Buy From Poloniex at {parseFloat(buyPrice)}</div>
                    {checks}
                </div>
            )
        })

        // successful arbitrage
        // buy on poloniex, sell on bittrex
        const poloniexBuys = buyFromPoloniexPrices.map((buyPrice, i) => {

            const key = buyPrice + i + ""

            const bittrexSellPrices = Object.keys(this.state.opps.poloniex[buyPrice])

            const opps = bittrexSellPrices.map((sellPrice, i) => {
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

        // buy on binance, sell on poloniex
        // DISABLED
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

        // buy on bittrex, sell on poloniex
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

        // matches
        const matchesBuyFromBittrex = Object.keys(this.state.matches.bittrex)
        const matchesBuyFromPoloniex = Object.keys(this.state.matches.poloniex)

        const bittrexMatches = matchesBuyFromBittrex
            .filter(p => this.state.matches.bittrex[p])
            .map(p => {
                return (
                    <div className={styles.opp} key={p}>
                        <div className={styles.oppBuySell}>
                            <div>Match: Buy on Bittrex: {parseFloat(p)}</div>
                        </div>
                    </div>
                )
            })

        const poloniexMatches = matchesBuyFromPoloniex
            .filter(p => this.state.matches.poloniex[p])
            .map(p => {
                return (
                    <div className={styles.opp} key={p}>
                        <div className={styles.oppBuySell}>
                            <div>Match: Buy on Poloniex: {parseFloat(p)}</div>
                        </div>
                    </div>
                )
            })
        return (
            <div>
                <button onClick={this.closeConnection}>Close</button>
                <div className={styles.dashboardWrap}>
                    <div className={styles.orderBook}>
                        <div className={styles.dashboardRows}>
                            <h2>Asks</h2>
                            <div className={styles.titles}>
                                <div className={styles.poloniex}>Poloniex</div>
                                <div className={styles.bittrex}>Bittrex</div>
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
                                <div className={styles.poloniex}>Poloniex</div>
                                <div className={styles.bittrex}>Bittrex</div>
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
                        <h2>Arbitrage Opportunities</h2>
                        <h3>Buy Opportunities</h3>
                        <div>{poloniexBuys}</div>
                        <div>{binanceBuys}</div>
                        <div>{bittrexBuys}</div>
                        <div>{bittrexMatches}</div>
                        <div>{poloniexMatches}</div>

                        <h3>Checks to buy on Bittrex and Sell on Poloniex</h3>
                        {bittrexChecks}
                        <h3>Checks to buy on Poloniex and Sell on Bittrex</h3>
                        {poloniexChecks}

                    </div>
                </div>

            </div>
        )
    }
}
