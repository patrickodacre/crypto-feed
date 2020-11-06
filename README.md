# Crypto Feed

This is a fun project where I experiment with different DEX APIs.

The app will connect to api streams from Poloniex and Bittrex, checking each bid / ask to see if there is an opportunity to buy low on one dex and sell higher on another.

## Running Locally

1. Start the NodeJS server to pull data from the Bittrex APIs

Bittrex websocket stream is done with SignalR, and the only lib I could find to work with it is meant for NodeJS, not for the browser. My quick solution was to just use SocketIO to forward the feed to the browser.

```bash
cd server && node server.js
```

2. Now start the NextJS app:

```bash
npm run dev
```

3. Profit
