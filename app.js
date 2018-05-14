const express = require('express');
const cors = require('cors');
const path = require('path');

/**
 * Express app for easier development
 * @type {*|Function}
 */

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/service-worker.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'service-worker.js'));
});

app.get('/', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = 8000;
app.listen(port, () => {
    console.log(`Up on ${port}`);
});