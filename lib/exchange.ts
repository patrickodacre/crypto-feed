export default {
    insertBidPrice,
    insertAskPrice,
    arbitrageAsk,
    arbitrageBid,
    matchBidToAsk,
    matchAskToBid,
}

const fees: ExchangeFees = {
    'poloniex' : 0.125,
    'binance' : 0.1,
    'bittrex' : 0.1,
}

// arbitrageBid checks the incoming BID order to see
// if there are any existing ASK orders on another exchange
// that would allow for buying LOW in order to satisfy
// the higher incoming bid.
function arbitrageBid(
    bid: OrderEventPayload,
    exchange: string,
    existingAsks: PriceToTotal,
    compareExchange: string
) : [OpportunitiesObj, boolean, boolean]
{

    const desiredLiquidity: number = parseFloat(bid.amount)
    const opps: OpportunitiesObj = {[compareExchange] : {}}

    if (! desiredLiquidity) {
        return [opps, false, true]
    }

    // I need to sell at this price w/ this fee
    const sellPrice: number = parseFloat(bid.price)
    const exchangeFee: number = sellPrice * fees[exchange]

    // we have a "BID" => an offer to buy
    // look at potential sellers to see if we can profit
    let profitFound = false
    for (const askPrice in existingAsks) {

        const availableLiquidity: number = parseFloat(existingAsks[askPrice].total)

        if (! availableLiquidity) {
            continue
        }

        let buyPrice: number
        {
            buyPrice = parseFloat(askPrice)
            const buyFee: number = buyPrice * fees[compareExchange]
            const profit: number = (sellPrice - buyPrice - (exchangeFee + buyFee))

            if (profit > 0) {
                profitFound = true
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

    return [opps, profitFound, false]
}

// arbitrageAsk checks the incoming ASK order to see
// if there are any existing BID orders on another exchange
// that would allow for buying LOW on this incoming ASK
// in order to sell HIGH to the existing BID order.
function arbitrageAsk(
    ask: OrderEventPayload,
    exchange: string,
    existingBids: PriceToTotal,
    compareExchange: string
) : [OpportunitiesObj, boolean, boolean]
{

    const availableLiquidity: number = parseFloat(ask.amount)
    const opps: OpportunitiesObj = {[exchange]: {}}

    if (! availableLiquidity) {
        return [opps, false, true]
    }

    // I can buy at this price w/ this fee:
    const buyPrice: number = parseFloat(ask.price)
    const buyFee: number = buyPrice * fees[exchange]

    // we have an "ASK" => an offer to sell
    // look at potential buyers to see if we can profit
    let profitFound = false
    for (const bidPrice in existingBids) {

        const desiredLiquidity: number = parseFloat(existingBids[bidPrice].total)

        if (! desiredLiquidity) {
            continue
        }

        let sellPrice: number
        {
            // I can sell at this price w/ this fee:
            sellPrice = parseFloat(bidPrice)
            const sellFee: number = sellPrice * fees[compareExchange]
            const profit: number = (sellPrice - buyPrice - (buyFee + sellFee))

            if (profit > 0) {
                profitFound = true
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

    return [opps, profitFound, false]
}

function matchAskToBid(
    ask: OrderEventPayload,
    sellingOn: string,
    existingBids: PriceToTotal
) : OrderMatches
{

    // the offer is to sell on poloniex
    // are there any offers to buy on Bittrex?
    const matches = {[sellingOn]: {}}

    const demand = existingBids[ask.price]
        ? parseFloat(existingBids[ask.price].total)
        : 0

    // we'll buy on poloniex to sell on bittrex
    matches[sellingOn][ask.price] = parseFloat(ask.amount) > 0 && demand > 0

    if (matches[sellingOn][ask.price]) {
        console.log('match!!')
    }

    return matches
}

function matchBidToAsk(
    bid: OrderEventPayload,
    sellingOn: string,
    existingAsks: PriceToTotal
) : OrderMatches {

    const matches = {[sellingOn]: {}}

    const supply = existingAsks[bid.price]
        ? parseFloat(existingAsks[bid.price].total)
        : 0

    matches[sellingOn][bid.price] = parseFloat(bid.amount) > 0 && supply > 0

    if (matches[sellingOn][bid.price]) {
        console.log('match!!')
    }

    return matches
}

function insertAskPrice(asks: string[], price: string) : string[] {

    const p: number = parseFloat(price)
    const aa: string[] = [...asks]

    if (aa.length === 0) {
        aa.push((p).toFixed(8))

        return aa
    }

    if (aa.length === 1) {
        if (parseFloat(aa[0]) > p) {
            aa.unshift((p).toFixed(8))
        } else {
            aa.push((p).toFixed(8))
        }

        return aa
    }
    if (p < parseFloat(aa[0])) {
        aa.unshift((p).toFixed(8))
        return aa
    }

    if (p > parseFloat(aa[aa.length-1])) {
        aa.push((p).toFixed(8))
        return aa
    }

    // add the bid price to the ORDERED array of bids
    for (let i = 1; i < aa.length; i++) {
        const lastPrice: number = parseFloat(aa[i-1])
        const thisPrice: number = parseFloat(aa[i])

        if (p > lastPrice && p < thisPrice) {
            aa.splice(i, 0, (p).toFixed(8))
            break
        }
    }

    return aa
}

function insertBidPrice(bids: string[], price: string) : string[] {

    const p: number = parseFloat(price)
    const bb: string[] = [...bids]

    if (bb.length === 0) {
        bb.push((p).toFixed(8))

        return bb
    }

    if (p > parseFloat(bb[0])) {
        bb.unshift((p).toFixed(8))
        return bb
    }

    if (p < parseFloat(bb[bb.length-1])) {
        bb.push((p).toFixed(8))
        return bb
    }

    // add the bid price to the ORDERED array of bids
    for (let i = 1; i < bb.length; i++) {
        const lastPrice: number = parseFloat(bb[i-1])
        const thisPrice: number = parseFloat(bb[i])

        if (p < lastPrice && p > thisPrice) {
            bb.splice(i, 0, (p).toFixed(8))
            break
        }
    }

    return bb
}
