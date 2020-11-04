type OrderUpdate = [string, number, string, string]
type TradeUpdate = [string, string, number, string, string, number]

interface PriceToTotal {
    exchangeID: string
    total: string
}

type EventHandler = ((payload?: any) => void)
interface EventsObj {
    [key: string]: EventHandler[]
}

// event payloads
interface OrderBookEventPayload {
    sortedBidPrices: string[]
    sortedAskPrices: string[]
    askPriceToTotal: {
        [key:string]: PriceToTotal
    }
    bidPriceToTotal: {
        [key:string]: PriceToTotal
    }
}

interface OrderEventPayload {
    exchangeID: string
    transaction:string
    type:string
    price:string
    amount:string
}

interface TradeEventPayload {
    exchangeID: string
    tradeID:string
    transaction:string
    type:string
    price:string
    amount:string
    timestamp:number
}

interface OrderBookObj {
    [key:string]: number
}

interface ReaderStreamCommand {
    command: string
    channel: string
}

interface ReaderAPI {
    start: (n?: number, command?: ReaderStreamCommand) => void
    restart: () => void
    close: () => void
    read: (data?: any) => void
    on: (evt: string, payload?: any) => void
}

interface OpportunitiesObj {
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

