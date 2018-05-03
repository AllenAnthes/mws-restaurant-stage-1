import express from 'express'
import cors from 'cors'
import path from 'path'

const app = express();

app.use(express.static(path.join(__dirname)));
app.use(cors);



const port = 8000;

app.listen(port, () => {

    app.get('/', (req, res) => {
        console.log('hit');
        res.status(200).sendFile(path.join(__dirname + '/index.html'));
    });
    console.log(`Up on ${port}`)
});