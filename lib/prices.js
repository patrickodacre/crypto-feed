export default {
    insertBidPrice,
    insertAskPrice,
    handleBid,
    handleAsk,
}

const fees = {
    'poloniex' : 0.125,
    'binance' : 0.1,
}

function handleAsk(ask, exchange, compareExchange, component) {
    const newPrices = insertAskPrice(component.state.sortedAskPrices, ask.price).slice(0, 20)

    const newTotals = JSON.parse(JSON.stringify(component.state.askPriceToTotal))
    newTotals[compareExchange][ask.price] = {
        exchangeID: compareExchange,
        total: ask.amount,
    }

    component.setState({askPriceToTotal: newTotals})
    component.setState({sortedAskPrices: newPrices})

    const availableLiquidity = parseFloat(ask.amount)

    if (! availableLiquidity) {
        return
    }

    // identify arbitrage opportunities
    {
        const opps = JSON.parse(JSON.stringify(component.state.opps))

        // I can buy at this price w/ this fee:
        const buyPrice = parseFloat(ask.price)
        const buyFee = buyPrice * fees[exchange]

        const bidPriceToTotalExchange = component.state.bidPriceToTotal[exchange]

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
                const sellFee = sellPrice * fees[compareExchange]
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

        component.setState({opps})
    }
}

function handleBid(bid, exchange, compareExchange, component) {
    const newPrices = insertBidPrice(component.state.sortedBidPrices, bid.price).slice(0, 20)

    const newTotals = JSON.parse(JSON.stringify(component.state.bidPriceToTotal))
    newTotals[exchange][bid.price] = {
        exchangeID: exchange,
        total: bid.amount,
    }

    component.setState({bidPriceToTotal: newTotals})
    component.setState({sortedBidPrices: newPrices})

    const desiredLiquidity = parseFloat(bid.amount)

    if (! desiredLiquidity) {
        return
    }

    // identify arbitrage opportunities
    {
        const opps = JSON.parse(JSON.stringify(component.state.opps))

        // I need to sell at this price w/ this fee
        const sellPrice = parseFloat(bid.price)
        const exchangeFee = sellPrice * fees[exchange]

        // we have a "BID" => an offer to buy
        // look at potential sellers to see if we can profit
        const askPriceToTotalCompare = component.state.askPriceToTotal[compareExchange]

        for (const askPrice in askPriceToTotalCompare) {

            const availableLiquidity = parseFloat(askPriceToTotalCompare[askPrice].total)

            if (! availableLiquidity) {
                continue
            }

            let buyPrice
            {
                buyPrice = parseFloat(askPrice)
                const buyFee = buyPrice * fees[compareExchange]
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

        component.setState({opps})
    }
}

function insertAskPrice(asks, price) {
    const p = parseFloat(price)
    const aa = [...asks]

    if (aa.length === 0) {
        aa.push((p).toFixed(8))

        return aa
    }

    if (aa.length === 1) {
        if (aa[0] > p) {
            aa.unshift((p).toFixed(8))
        } else {
            aa.push((p).toFixed(8))
        }

        return aa
    }
    if (p < aa[0]) {
        aa.unshift((p).toFixed(8))
        return aa
    }

    if (p > aa[aa.length-1]) {
        aa.push((p).toFixed(8))
        return aa
    }

    // add the bid price to the ORDERED array of bids
    for (let i = 1; i < aa.length; i++) {
        const lastPrice = aa[i-1]
        const thisPrice = aa[i]

        if (p > lastPrice && p < thisPrice) {
            aa.splice(i, 0, (p).toFixed(8))
            break
        }
    }

    return aa
}

function insertBidPrice(bids, price) {
    const p = parseFloat(price)
    const bb = [...bids]

    if (bb.length === 0) {
        bb.push((p).toFixed(8))

        return bb
    }

    if (p > bb[0]) {
        bb.unshift((p).toFixed(8))
        return bb
    }

    if (p < bb[bb.length-1]) {
        bb.push((p).toFixed(8))
        return bb
    }

    // add the bid price to the ORDERED array of bids
    for (let i = 1; i < bb.length; i++) {
        const lastPrice = bb[i-1]
        const thisPrice = bb[i]

        if (p < lastPrice && p > thisPrice) {
            bb.splice(i, 0, (p).toFixed(8))
            break
        }
    }

    return bb
}
