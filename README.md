# mongodb-transactions-test

## Installation

1. `npm install`

2. `cp .env.example .env`

3. Set env `MONGO_URL=` to 4.0.0 replica set DB

4. `npm run test`

## Behavior

The second test (100ms) becomes locked in a never-ending loop while the first test passess
