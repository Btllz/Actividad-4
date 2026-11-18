const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config();
const JWT = require('jsonwebtoken');
const PORT = process.env.PORT || 3000;
const DB = process.env.DB;
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//---------------------------------------------------DB----------------------------------------
const usuarioSchema = new mongoose.Schema({
    correo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, enum: ['usuario', 'admin'], default: 'usuario' }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, required: true, min: 0 },
    cantidadDisponible: { type: Number, required: true, min: 0 },
});

const Producto = mongoose.model('Producto', productoSchema);

//----------------------------------------------FUNCIONES Y MIDDLEWARES--------------------------------------------------
async function cifrarPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

async function datosValidos(passwordEscrita, passwordGuardada) {
    return await bcrypt.compare(passwordEscrita, passwordGuardada);
}

function verificarToken(req, res, next) {
    const cabecera = req.headers['authorization'];
    if (!cabecera) return res.status(401).json({ error: 'Falta el token' });

    const token = cabecera.split(' ')[1];

    try {
        const datos = JWT.verify(token, JWT_SECRET);
        req.Usuario = datos;
        next();
    } catch (error) {
        console.log(error.message);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function esAdmin(req, res, next) {
    if (req.Usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Se requiere rol de administrador' });
    }
    next();
}

//---------------------------------------------RUTAS---------------------------------------------------------
app.post('/compras/register', async (req, res) => {
    try {
        const { correo, password } = req.body;
        if (!correo || !password) return res.status(400).json({ mensaje: 'Ingresa el correo electrónico y la contraseña' });

        const existe = await Usuario.findOne({ correo });
        if (existe) return res.status(409).json({ mensaje: 'El correo ya está registrado' });

        const nuevaPassword = await cifrarPassword(password);

        await Usuario.create({ correo: correo, password: nuevaPassword });
        res.status(201).json({ mensaje: 'Cuenta creada' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

//--------------------------------------------------LOGIN-------------------------------------------------------------------------
app.post('/compras/login', async (req, res) => {
    try {
        const { correo, password } = req.body;
        if (!correo || !password) return res.status(400).json({ mensaje: 'Llena todos los campos' });

        const usuario = await Usuario.findOne({ correo });
        if (!usuario) return res.status(401).json({ mensaje: 'Correo o contraseña inválidos' });

        const contraseñaCorrecta = await datosValidos(password, usuario.password);
        if (!contraseñaCorrecta) return res.status(401).json({ mensaje: 'Correo o contraseña inválidos' });

        const token = JWT.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

//-------------------------------------------------AGREGAR PRODUCTO--------------------------------------------------------------
app.post('/compras/add', verificarToken, esAdmin, async (req, res) => {
    try {
        const { nombre, precio, cantidadDisponible } = req.body;

        if (!nombre || precio === undefined || cantidadDisponible === undefined) {
            return res.status(400).json({ mensaje: 'Llena todos los campos' });
        }
        if (precio < 0) return res.status(400).json({ mensaje: 'El precio no puede ser menor a cero' });
        if (cantidadDisponible < 0) return res.status(400).json({ mensaje: 'La cantidad no puede ser menor a cero' });

        await Producto.create({ nombre, precio, cantidadDisponible });
        res.status(201).json({ mensaje: 'Producto agregado correctamente' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

//-----------------------------------------------------GET---------------------------------------------------
app.get('/compras/get', verificarToken, async (req, res) => {
    try {
        const productos = await Producto.find();

        res.status(200).json({
            mensaje: 'Lista de productos obtenida con éxito',
            total: productos.length,
            productos
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

//-----------------------------------------------------COMPRAR---------------------------------------------------
app.post('/compras/comprar/:id', verificarToken, async (req, res) => {
    try {
        const producto = await Producto.findOneAndUpdate(
            { _id: req.params.id, cantidadDisponible: { $gt: 0 } },
            { $inc: { cantidadDisponible: -1 } },
            { new: true }
        );

        if (!producto) return res.status(409).json({ error: 'Producto agotado o inexistente' });

        res.status(200).json({ mensaje: 'Compra realizada', producto });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error al comprar' });
    }
});

//-----------------------------------------------------------------UPDATE---------------------------------------------------------
app.put('/compras/:id', verificarToken, esAdmin, async (req, res) => {
    try {
        const { nombre, precio, cantidadDisponible } = req.body;

        const productoActualizado = await Producto.findByIdAndUpdate(
            req.params.id.trim(),
            { nombre, precio, cantidadDisponible },
            { new: true, runValidators: true }
        );

        if (!productoActualizado) return res.status(404).json({ error: 'Producto no encontrado' });

        res.status(200).json({ mensaje: 'Producto actualizado correctamente', Producto: productoActualizado });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
});

//--------------------------------------------DELETE-----------------------------------------------------
app.delete('/compras/delete/:id', verificarToken, esAdmin, async (req, res) => {
    try {
        const productoEliminado = await Producto.findByIdAndDelete(req.params.id.trim());

        if (!productoEliminado) return res.status(404).json({ mensaje: 'No se encontró el producto' });

        res.status(200).json({
            mensaje: 'Producto eliminado correctamente',
            Producto: productoEliminado
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error al eliminar el producto' });
    }
});

if (require.main === module) {
    mongoose.connect(DB)
        .then(() => console.log('conectado a la base de datos'))
        .catch(err => console.log('Error', err.message));

    app.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
}

module.exports = app;

// app.listen(PORT, () => {
//     console.log(`Servidor corriendo en el puerto ${PORT}`);
// });