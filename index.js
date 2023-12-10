

const apm = require('elastic-apm-node').start()
const express = require('express');
const mongoose = require('mongoose');

const app = express();
mongoose.connect('mongodb://localhost:27017/log', { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

if (apm.isStarted()) {
    console.log('APM is started')
}

mongoose.set('debug', (collectionName, method, query, doc) => {
    if (apm.isStarted()) {

        const user = apm.currentTransaction?._user
        const transactionId = apm.currentTraceIds['transaction.id']

        console.log(`${JSON.stringify(user)}, ${transactionId}, ${collectionName}.${method}`, JSON.stringify(query), doc);
    }
})

const userSchema = new mongoose.Schema({
    id: Number
});

const userModel = mongoose.model('User', userSchema);

app.use((req, res, next) => {
    const apmMetadata = {
        apm: {
            traceId: apm.currentTraceIds['trace.id'],
            transactionId: apm.currentTraceIds['transaction.id'],
        },
    };

    apm.setUserContext({
        id: '123',
        username: '123',
        email: '123',
    })

    req.apmMetadata = apmMetadata;
    next();
});

app.get('/1', async (req, res) => {
    const users = await userModel.find({ id: 1 });

    res.send(users);
});

app.get('/2', async (req, res) => {
    const seq = await userModel.countDocuments();

    const u = new userModel({ id: seq });
    await u.save();

    res.send(u);
})


app.listen(3000, () => console.log('Server running on port 3000'));