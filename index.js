

const fs = require('fs');
const apm = require('elastic-apm-node').start(JSON.parse(fs.readFileSync('./config.json', 'utf8')))
const express = require('express');
const mongoose = require('mongoose');

const app = express();
mongoose.connect('mongodb://localhost:27017/log', { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

if (apm.isStarted()) {
    console.log('APM is started')
}

mongoose.set('debug', (collectionName, method, query, doc) => {
    // 조건
    // 1. collectionName이 users
    // 2. userId가 있을 경우
    // 3. 조회일 경우
    if (collectionName === 'users' && apm.isStarted()) {

        const user = apm.currentTransaction?._user || {}
        const custom = apm.currentTransaction?._custom || {}
        const transactionId = apm.currentTraceIds['transaction.id']

        //pino로 적당히 -> stream으로 보내면 될듯
        console.log(`${JSON.stringify(custom)}, ${JSON.stringify(user)}, ${transactionId}, ${collectionName}.${method}`, JSON.stringify(query), doc);
        //{"hello":"world"}, {"id":"123","username":"123","email":"123"}, 028db2efed1ce952, users.find {"id":1} { sort: { _id: -1 } }
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

    apm.setCustomContext({
        hello: 'world'
    })

    req.apmMetadata = apmMetadata;
    next();
});

app.get('/1', async (req, res) => {
    const users = await userModel.find({ id: 1 }).sort({ _id: -1 });

    res.send(users);
});

app.get('/2', async (req, res) => {
    const seq = await userModel.countDocuments();

    const u = new userModel({ id: seq });
    await u.save();

    res.send(u);
})


app.listen(3000, () => console.log('Server running on port 3000'));