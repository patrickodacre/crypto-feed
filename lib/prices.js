export default {
    insertBidPrice,
    insertAskPrice,
}

function insertAskPrice(asks, price) {
    const p = parseFloat(price)
    const aa = [...asks]

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
