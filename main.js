const binanceWebSocket = "wss://stream.binance.com/stream"
const binanceFuturesWebSocket = "wss://fstream.binance.com/stream"
const BinanceFuturesMessage = '{"method":"SUBSCRIBE","params":["!miniTicker@arr"],"id":1}'
const BinanceMessage = '{"method":"SUBSCRIBE","params":["!miniTicker@arr@3000ms","!ticker_1h@arr@3000ms","!ticker_4h@arr@3000ms"],"id":1}'
const ticker = {
    1:"!ticker_1h@arr@3000ms",
    4:"!ticker_4h@arr@3000ms",
    24:"!miniTicker@arr@3000ms"
}
/**
 * A program that retrieves data from a websocket endpoint in realtime,
 * as it appears on the official Polygon PoS Chain Explorer: https://polygonscan.com
 */
class Binance {
    /**
     * Endpoint retrieved from the interface
     * @param endpoint
     * @param print
     * @param callback
     * @param message
     */
    constructor(endpoint, print= 1, callback = this.printData, message = BinanceMessage) {
        this.callback = callback
        this.print = print
        this.ticker = ticker[1]
        this.sendMessage = message
        this.ws = new WebSocket(endpoint);
        this.metadata = undefined
        this.requestNumber = 0
        this.block = 0
        this.info = undefined
        this.blocks = undefined
        this.txns = undefined
    }

    /**
     * Get last block number mint
     * @returns {*}
     */
    get getLastBlock ()
    {
        return this.info.lastblock
    }

    /**
     * 10 randomly selected transactions of the current response from the websocket
     * @returns {*}
     */
    get getTransactions ()
    {
        return this.txns
    }

    /**
     * MarketCap getter
     * @returns {*}
     */
    get getMarketCap()
    {
        return this.info.marketcap
    }

    /**
     * Block getter
     * @returns {*}
     */
    get getBlocks()
    {
        return this.blocks
    }

    /**
     * Prints internal data of each block
     */
    printData()
    {
        this.getBlocks.forEach((inBlock)=>{
            console.log(`Block: ${inBlock.b_no}. Minner: ${inBlock.b_miner}`)
        })
    }

    /**
     * Subscribes to the websocket
     * @param event
     */
    subscribe (event)
    {
        this.ws.onopen = (response=> {
            this.ws.send(event)
        })
        this.ws.onmessage = (response => {
            !this.requestNumber ? this.saveConnection(response.data) : this.retrieveData(response.data)
            this.requestNumber += 1
        })
    }

    /**
     * First message sent by the endpoint when the first connection in established
     * @param response
     */
    saveConnection(response)
    {
        console.log(JSON.parse(response).event)
    }

    /**
     * Receives the relevant data of the endpoint and retrieves the data by checking redundant blocks
     * @param response
     */
    retrieveData(response)
    {
        if(this.ticker === JSON.parse(response).stream) {
            console.log(this.metadata)
            this.metadata = JSON.parse(response).data.filter(obj => obj.s.includes("USDT"))
            this.callback(this.metadata)
        }
    }



    /**
     * Runs the main program by subscribing to the websocket
     * and sends the message for a request of the relevant metadata
     */
    run ()
    {
        this.subscribe(this.sendMessage)
    }
}

/**
 * Creates a new instance of the class and calls the run method to start running the program
 */
function main(){
    new Binance(binanceWebSocket, 1).run()
}

/**
 * Runs the main function of the program
 */
// main()

