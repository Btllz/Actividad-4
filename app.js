const express = require('express');
const app = express();
require('dotenv').config();
const JWT = require('jsonwebtoken');
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Servidor corriendo');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`)
});