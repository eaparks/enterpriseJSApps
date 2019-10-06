import express from 'express';
import bodyParser from 'body-parser';
import elasticsearch from 'elasticsearch';

const HTTP_201 = 201;
const HTTP_400 = 400;
const HTTP_415 = 415;
const HTTP_500 = 500;
const app = express();

app.use(bodyParser.json({limit: 1e6}));

const client = new elasticsearch.Client({
    host: `${process.env.ELASTICSEARCH_PROTOCOL}://${process.env.ELASTICSEARCH_HOSTNAME}:${process.env.ELASTICSEARCH_PORT}`
});

if (process.env.NODE_ENV === 'test') {
    process.env.ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX_TEST;
    process.env.SERVER_PORT = process.env.SERVER_PORT_TEST;
} else {
    process.env.ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX_DEV;
    process.env.SERVER_PORT = process.env.SERVER_PORT_DEV;
}

function checkContentTypeMiddleware (req, res, next) {
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.headers['content-length'] !== '0') {
        // Then the req must have a Content-Type header
        if (!req.headers['content-type']) {
            res.status(HTTP_400);
            res.set('Content-Type', 'application/json');
            res.json({message: 'The "Content-Type" header must be set for POST, PATCH, and PUT requests with a non-empty payload.'});

            return;
        }
        if (req.headers['content-type'] !== 'application/json') {
            res.status(HTTP_415);
            res.set('Content-Type', 'application/json');
            res.json({message: 'The "Content-Type" header must always be "application/json"'});

            return;
        }
    }
    next();
}

app.use(checkContentTypeMiddleware);

app.post('/users/', (req, res) => {

    if (req.headers['content-length'] === '0') {
        res.status(HTTP_400);
        res.set('Content-Type', 'application/json');
        res.json({message: 'Payload should not be empty'});

        return;
    }
    if (!req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password')) {
        res.status(HTTP_400);
        res.set('Content-Type', 'application/json');
        res.json({message: 'Payload must contain at least the email and password fields'});

        return;
    }
    if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
        res.status(HTTP_400);
        res.set('Content-Type', 'application/json');
        res.json({message: 'The email and password fields must be of type string'});

        return;
    }
    if (!/^[\w.+]+@\w+\.\w+$/.test(req.body.email)) {
        res.status(HTTP_400);
        res.set('Content-Type', 'application/json');
        res.json({message: 'The email field must be a valid email.'});

        return;
    }
    client.index({
        index: process.env.ELASTICSEARCH_INDEX,
        type: 'user',
        body: req.body
    })
        .then((result) => {
            res.status(HTTP_201);
            res.set('Content-Type', 'text/plain');
            res.send(result._id);

        })
        .catch(() => {
            res.status(HTTP_500);
            res.set('Content-Type', 'application/json');
            res.json({message: 'Internal Server Error'});
        });
});

// eslint-disable-next-line func-names
app.use(function errorHandler (err, req, res, next) {
    if (err instanceof SyntaxError && err.status === HTTP_400 && 'body' in err && err.type === 'entity.parse.failed') {
        res.status(HTTP_400);
        res.set('Content-Type', 'application/json');
        res.json({message: 'Payload should be in JSON format'});

        return;
    }
    next();
});

app.listen(process.env.SERVER_PORT, () => {
    console.log(`Hobnob API server listening on port ${process.env.SERVER_PORT}!`);
});
