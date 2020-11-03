export default {
    insertBidPrice,
    insertAskPrice,
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
