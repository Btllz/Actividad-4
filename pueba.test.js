require('dotenv').config();
const request = require('supertest');
const JWT = require('jsonwebtoken');
const app = require('./app');

describe('Rutas protegidas', () => {
    test('GET /compras/get sin token responde 401', async () => {
        const res = await request(app).get('/compras/get');
        expect(res.statusCode).toBe(401);
    });

    test('usuario normal no puede agregar productos (403)', async () => {
        const token = JWT.sign({ id: '123', rol: 'usuario' }, process.env.JWT_SECRET);

        const res = await request(app)
            .post('/compras/add')
            .set('Authorization', 'Bearer ' + token)
            .send({ nombre: 'Lápiz', precio: 10, cantidadDisponible: 5 });

        expect(res.statusCode).toBe(403);
    });
});

describe('Validaciones de registro y login', () => {
    test('registro sin contraseña responde 400', async () => {
        const res = await request(app)
            .post('/compras/register')
            .send({ correo: 'a@a.com' });
        expect(res.statusCode).toBe(400);
    });

    test('login sin campos responde 400', async () => {
        const res = await request(app).post('/compras/login').send({});
        expect(res.statusCode).toBe(400);
    });
});