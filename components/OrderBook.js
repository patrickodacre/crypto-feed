import React from 'react'
import { w3cwebsocket as W3CWebSocket } from "websocket";
import poloniexReader from "../lib/readers/poloniex.ts"
import styles from './OrderBook.module.scss'
import prices from '../lib/prices'

export default class OrderBook extends React.Component {

    constructor(props) {
        super(props)

        this.poloniex = null

        this.asks= []
        this.askPriceToTotal= {}
        this.bids= []
        this.bidPriceToTotal= {}

        this.countLeft = null

        this.state = {
            sortedAskPrices: [],
            sortedBidPrices: [],
            askPriceToTotal: {},
            bidPriceToTotal: {},
        }
    }

    // https://docs.poloniex.com/#price-aggregated-book
    componentDidMount() {
        this.poloniex = poloniexReader.client()

        // initialize the order book
        this.poloniex.on('orderbook', ({sortedAskPrices, sortedBidPrices, askPriceToTotal, bidPriceToTotal}) => {
            this.setState({sortedAskPrices, sortedBidPrices, askPriceToTotal, bidPriceToTotal})
        })

        // restart to refresh the books
        // this is more reliable than trying to match
        // trades with orders
        this.poloniex.on('trade', trade => {
            console.log('restarting', trade)
            this.poloniex.restart(20)
        })

        this.poloniex.on('data', d => console.log(d))

        this.poloniex.on('bid', bid => {

            const newPrices = prices.insertBidPrice(this.state.sortedBidPrices, bid.price)

            const newTotals = this.poloniex.updatePriceToTotal(this.state.bidPriceToTotal, bid.price, bid.amount)

            this.setState({bidPriceToTotal: newTotals, sortedBidPrices: newPrices})
        })

        this.poloniex.on('error', err => {
            console.error(err.message)
        })

        this.poloniex.on('ask', ask => {
            if (parseFloat(ask.amount) == 0) {
                return
            }

            const newPrices = prices.insertAskPrice(this.state.sortedAskPrices, ask.price).slice(0, 20)

            const newTotals = this.poloniex.updatePriceToTotal(this.state.askPriceToTotal, ask.price, ask.amount)

            this.setState({askPriceToTotal: newTotals})
            this.setState({sortedAskPrices: newPrices})
        })

        this.poloniex.on('bid', bid => {
            if (parseFloat(bid.amount) == 0) {
                return
            }

            const newPrices = prices.insertBidPrice(this.state.sortedBidPrices, bid.price).slice(0, 20)

            const newTotals = this.poloniex.updatePriceToTotal(this.state.bidPriceToTotal, bid.price, bid.amount)

            this.setState({bidPriceToTotal: newTotals})
            this.setState({sortedBidPrices: newPrices})
        })

        this.poloniex.start(20)
    }

    checkTotals = () => {
        console.log('asks', this.state.askPriceToTotal)
        console.log('bids', this.state.bidPriceToTotal)
    }

    closeConnection = () => {
        this.poloniex.close()
    }

    render () {

        const asks = this.state.sortedAskPrices.map(p => {

            const a = parseFloat(this.state.askPriceToTotal[p].total)
            const amount = a > 0
                ? (a).toFixed(8)
                : 0
            const total = a > 0
                ? (parseFloat(p) * a).toFixed(8)
                : 0

            return (
                <div className={styles.dashboardRow} key={p.toString()}>
                    <div className={styles.price}>{p}</div>
                    <div className={styles.amount}>{amount}</div>
                    <div className={styles.total}>{total}</div>
                </div>
            )
        })

        const bids = this.state.sortedBidPrices.map(p => {
            const a = parseFloat(this.state.bidPriceToTotal[p].total)
            const amount = a > 0
                             ? (a).toFixed(8)
                             : 0
            const total = a > 0
                            ? (parseFloat(p) * a).toFixed(8)
                            : 0

            return (
                <div className={styles.dashboardRow} key={p.toString()}>
                <div className={styles.price}>{p}</div>
                <div className={styles.amount}>{amount}</div>
                <div className={styles.total}>{total}</div>
                </div>
            )
        })

        return (
            <div>
                <button onClick={this.closeConnection}>Close</button>
                <button onClick={this.checkTotals}>Check</button>
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

            </div>
        )
    }
}
