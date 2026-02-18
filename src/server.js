require('dotenv').config()
const express = require('express')
const cors = require('cors')

const routes = require('./routes')
const errorMiddleware = require('./middlewares/errorMiddleware')

const app = express()

app.use(express.json())
app.use(cors())
app.use(routes)
app.use(errorMiddleware)

const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}/status`);
})