const express = require('express');
const app = express();
const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'inforever',
    database: 'apploteria'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
});

app.use(express.json());
app.use(express.static(__dirname + '/public/apploteria'));

app.post('/api/buy', async (req, res) => {
    const { variantId, amount, name, lastName, type } = req.body;
    console.log(`Variant ID: ${variantId}`);
    try {
        let variant = await getVariant(variantId); // Usar 'let' en lugar de 'const'
        console.log(variant);
        if (!variant) {
            return res.status(404).json({ error: 'Variante no encontrada' });
        }

        // Actualizar availableBalance
        variant.available_balance -= amount;
        if (variant.available_balance < 0) {
            return res.status(403).json({ error: 'Saldo insuficiente en la variante' });
        }

        // Guardar la actualización en la base de datos
        await updateVariant(variant);

        let user = await getUser(name, lastName);
        if (!user) {
            user = await createUser(name, lastName);
        }

        let purchase = await createPurchase(user.id,amount, variantId);
        if (!purchase) {
            return res.status(500).json({ error: 'Error al crear compra' });
        }
        

        if (variant.availableBalance <= 0) {
            // Generar ganador aleatorio
            const winner = await getWinner(variantId);
            return res.json({ success: true, winner });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error desconocido' });
    }
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});

function getVariant(variantId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM variants WHERE id = ?';
        db.query(query, [variantId], (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results[0]); // Asegúrate de devolver el primer resultado
        });
    });
}


function getUser(name, lastName) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE name = ? AND last_name = ?';
        db.query(query, [name, lastName], (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results[0]);
        });
    });
}

function createUser(name, lastName) {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO users (name, last_name,email) VALUES (?, ?,"prubea@asd.com")';
        db.query(query, [name, lastName], (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results.insertId);
        });
    });
}

function createPurchase(userId, amount, variantId) {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO purchases (user_id, amount, variant_id) VALUES (?, ?, ?)';
        db.query(query, [userId, amount, variantId], (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results.insertId);
        });
    });
}

function updateVariant(variant) {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE variants SET available_balance = ? WHERE id = ?';
        db.query(query, [variant.available_balance, variant.id], (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
}

function getWinner(variantId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users ORDER BY RAND() LIMIT 1';
        db.query(query, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results[0]);
        });
    });
}