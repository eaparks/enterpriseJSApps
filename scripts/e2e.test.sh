#!/usr/bin/env bash

# Set environment variables from .env and set NODE_ENV to test
export $(cat .env | grep -v "^#" | xargs)
export NODE_ENV=test

# Run our API server as a background process
yarn run serve &

# Polling to see if the server is up and running yet
TRIES=0
RETRY_LIMIT=50
RETRY_INTERVAL=0.2
SERVER_UP=false
until lsof -i:8080; do
    sleep $RETRY_INTERVAL
done

npx dotenv cucumberjs spec/cucumber/features -- --compiler js:babel-register --require spec/cucumber/steps &

exit 0
