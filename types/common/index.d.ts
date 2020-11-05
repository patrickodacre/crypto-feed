type OrderUpdate = [string, number, string, string]
type TradeUpdate = [string, string, number, string, string, number]

type PriceToTotal = {
    exchangeID: string
    total: string
}

type EventHandler = ((payload?: any) => void)
type EventsObj = {
    [key: string]: EventHandler[]
}

type ExchangeFees = {
    [key: string]: number
}

// event payloads
type OrderBookEventPayload = {
    sortedBidPrices: string[]
    sortedAskPrices: string[]
    askPriceToTotal: {
        [key:string]: PriceToTotal
    }
    bidPriceToTotal: {
        [key:string]: PriceToTotal
    }
}

type OrderEventPayload = {
    exchangeID: string
    transaction:string
    type:string
    price:string
    amount:string
}

type TradeEventPayload = {
    exchangeID: string
    tradeID:string
    transaction:string
    type:string
    price:string
    amount:string
    timestamp:number
}

type OrderBookObj = {
    [key:string]: number
}

type ReaderStreamCommand = {
    command: string
    channel: string
}

type ReaderAPI = {
    start: (...args?: any) => void
    close: () => void
    read: (data?: any) => void
    on: (evt: string, payload?: any) => void
}

type OpportunitiesObj = {
    // exchange name/id
    [key: string]: {
        // buy/ask price
        [key: string]: {
            // sell/bid price
            [key:string]: {
                // liquidity
                buy: number
                sell: number
            }
        }
    }
}

