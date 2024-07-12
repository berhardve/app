const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');

// Configurar bodyParser para procesar JSON
app.use(bodyParser.json());

// Configuración de Sequelize y conexión a MySQL
const sequelize = new Sequelize('rafflex_app', 'prueba', 'prueba1234', {
  host: 'notif.ngrcomputacion.cl',
  dialect: 'mysql',
  logging: false // Para deshabilitar los logs SQL en la consola
});

// Comprobar la conexión a la base de datos
sequelize.authenticate()
  .then(() => {
    console.log('Conexión establecida correctamente con la base de datos MySQL');
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err);
  });

// Definir modelos
const Raffle = sequelize.define('raffle', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true }
  // Agrega más campos según sea necesario
});

const RaffleNumber = sequelize.define('raffle_number', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  raffleId: Sequelize.INTEGER,
  number: Sequelize.INTEGER,
  max_amount: Sequelize.INTEGER,
  amount_sold: { type: Sequelize.INTEGER, defaultValue: 0 }
});

const Winner = sequelize.define('winner', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  raffleId: Sequelize.INTEGER,
  raffleNumberId: Sequelize.INTEGER,
  buyerName: Sequelize.STRING,
  amountBought: Sequelize.INTEGER,
  remainingAmount: Sequelize.INTEGER
}, {
  timestamps: false  // Deshabilitar la gestión automática de createdAt y updatedAt
});

// Relaciones entre modelos
Raffle.hasMany(RaffleNumber);
RaffleNumber.belongsTo(Raffle);
Winner.belongsTo(Raffle, { foreignKey: 'raffleId' });
Winner.belongsTo(RaffleNumber, { foreignKey: 'raffleNumberId' });

// Sincronización de modelos con la base de datos
sequelize.sync({ force: false }) // Cambiar a true para reiniciar las tablas en cada reinicio
  .then(() => {
    console.log('Modelos sincronizados con la base de datos');
  })
  .catch(err => {
    console.error('Error al sincronizar modelos y base de datos:', err);
  });

// Rutas de la aplicación
app.use(express.static(__dirname + '/public/raffle'));

// Crear una nueva rifa
app.post('/raffles', (req, res) => {
  const { numbers, maxAmountPerNumber } = req.body;

  // Crear la rifa inicialmente sin los números de rifa asociados
  Raffle.create({})
    .then(raffle => {
      const raffleId = raffle.id;
      const raffleNumbers = [];

      // Generar números de rifa desde 1 hasta numbers
      for (let i = 1; i <= numbers; i++) {
        raffleNumbers.push({
          raffleId: raffleId,
          number: i,
          max_amount: maxAmountPerNumber,
          amount_sold: 0  // Saldo inicial para este número
        });
      }

      // Insertar todos los números de rifa en la base de datos
      RaffleNumber.bulkCreate(raffleNumbers)
        .then(() => {
          // Devolver la rifa creada con los números de rifa asociados
          Raffle.findByPk(raffleId, { include: [RaffleNumber] })
            .then(raffleWithNumbers => {
              res.json(raffleWithNumbers);
            })
            .catch(err => {
              console.error('Error al obtener la rifa con números de rifa:', err);
              res.status(500).json({ error: 'Error al obtener la rifa con números de rifa' });
            });
        })
        .catch(err => {
          console.error('Error al crear números de rifa:', err);
          res.status(500).json({ error: 'Error al crear números de rifa' });
        });
    })
    .catch(err => {
      console.error('Error al crear la rifa:', err);
      res.status(500).json({ error: 'Error al crear la rifa' });
    });
});

// Obtener todas las rifas con números de rifa asociados y su información adicional
app.get('/raffles', (req, res) => {
  Raffle.findAll({
    include: [{
      model: RaffleNumber
    }]
  })
    .then(raffles => {
      // Formatear la respuesta para incluir la información de cantidad restante por número
      const formattedRaffles = raffles.map(raffle => {
        const formattedNumbers = raffle.raffle_numbers.map(number => ({
          id: number.id,
          raffleId: number.raffleId,
          number: number.number,
          max_amount: number.max_amount,
          amount_sold: number.amount_sold,
          remaining_amount: number.max_amount - number.amount_sold // Calculamos el monto restante
        }));

        return {
          id: raffle.id,
          numbers: formattedNumbers
        };
      });

      res.json(formattedRaffles);
    })
    .catch(err => {
      console.error('Error al obtener las rifas:', err);
      res.status(500).json({ error: 'Error al obtener las rifas' });
    });
});

// Comprar un número de rifa
app.post('/raffles/:raffleId/buy', (req, res) => {
  const { raffleId } = req.params;
  const { buyerName, number, amountToBuy } = req.body;

  RaffleNumber.findOne({
    where: { raffleId, number }
  }).then(raffleNumber => {
    if (!raffleNumber) {
      return res.status(404).json({ error: 'Número de rifa no encontrado' });
    }

    if (raffleNumber.amount_sold >= raffleNumber.max_amount) {
      return res.status(400).json({ error: 'Se ha alcanzado el límite de venta para este número' });
    }

    // Verificar si hay suficiente saldo restante para comprar
    const remainingAmount = raffleNumber.max_amount - raffleNumber.amount_sold;
    if (amountToBuy > remainingAmount) {
      return res.status(400).json({ error: 'No hay suficiente saldo restante para este número' });
    }

    // Registrar al ganador
    Winner.create({
      raffleId,
      raffleNumberId: raffleNumber.id,
      buyerName,
      amountBought: amountToBuy,
      remainingAmount
    }).then(() => {
      // Actualizar la cantidad vendida
      raffleNumber.amount_sold += parseInt(amountToBuy);
      raffleNumber.save();

      res.json({
        number: raffleNumber.number,
        buyerName: buyerName,
        amount: amountToBuy,
        remainingAmount: remainingAmount
      });
    }).catch(err => {
      console.error('Error al registrar al ganador:', err);
      res.status(500).json({ error: 'Error al registrar al ganador' });
    });

  }).catch(err => {
    console.error('Error al comprar el número de rifa:', err);
    res.status(500).json({ error: 'Error al comprar el número de rifa' });
  });
});

// Obtener la cantidad restante para un número específico de una rifa
app.get('/raffles/:raffleId/number/:number/remaining', (req, res) => {
  const { raffleId, number } = req.params;

  RaffleNumber.findOne({ where: { raffleId: raffleId, number: number } })
    .then(raffleNumber => {
      if (!raffleNumber) {
        return res.status(404).json({ error: 'Número de rifa no encontrado' });
      }
      const remainingAmount = raffleNumber.max_amount - raffleNumber.amount_sold;
      res.json({ remainingAmount: remainingAmount });
    })
    .catch(err => {
      console.error('Error al obtener la cantidad restante:', err);
      res.status(500).json({ error: 'Error al obtener la cantidad restante' });
    });
});

// Obtener los ganadores de una rifa específica (GET)
app.get('/raffles/:raffleId/winners', (req, res) => {
  const { raffleId } = req.params;

  Winner.findAll({
    where: { raffleId },
    include: [{
      model: RaffleNumber,
      attributes: ['number'] // Incluir solo los atributos necesarios del modelo RaffleNumber
    }]
  })
    .then(winners => {
      // Formatear la respuesta para asegurar que el número de rifa esté presente y no sea undefined
      const formattedWinners = winners.map(winner => ({
        id: winner.id,
        raffleId: winner.raffleId,
        raffleNumberId: winner.raffleNumberId,
        buyerName: winner.buyerName,
        amountBought: winner.amountBought,
        remainingAmount: winner.remainingAmount,
        number: winner.raffle_number ? winner.raffle_number.number : 'Número no especificado'
      }));

      res.json(formattedWinners);
    })
    .catch(err => {
      console.error('Error al obtener ganadores:', err);
      res.status(500).json({ error: 'Error al obtener ganadores' });
    });
});

// Registrar un ganador para una rifa y un número específico (POST)
app.post('/raffles/:raffleId/winners', (req, res) => {
  const { raffleId } = req.params;
  const { number, buyerName, amountBought, remainingAmount } = req.body;

  RaffleNumber.findOne({
    where: { raffleId, number }
  })
    .then(raffleNumber => {
      if (!raffleNumber) {
        return res.status(404).json({ error: 'Número de rifa no encontrado' });
      }

      // Crear un nuevo registro de ganador
      Winner.create({
        raffleId,
        raffleNumberId: raffleNumber.id,
        buyerName,
        amountBought,
        remainingAmount
      })
        .then(newWinner => {
          res.json(newWinner);
        })
        .catch(err => {
          console.error('Error al registrar ganador:', err);
          res.status(500).json({ error: 'Error al registrar ganador' });
        });
    })
    .catch(err => {
      console.error('Error al buscar número de rifa:', err);
      res.status(500).json({ error: 'Error al buscar número de rifa' });
    });
});

// Seleccionar un ganador para una rifa y un número específico
app.post('/raffles/:raffleId/register-winner', (req, res) => {
  const { raffleId } = req.params;
  const { number } = req.body;

  RaffleNumber.findOne({
    where: { raffleId, number }
  })
    .then(raffleNumber => {
      if (!raffleNumber) {
        return res.status(404).json({ error: 'Número de rifa no encontrado' });
      }

      // Encontrar al comprador de este número de rifa y registrar como ganador
      Winner.findOne({
        where: { raffleNumberId: raffleNumber.id }
      })
        .then(winner => {
          if (!winner) {
            return res.status(404).json({ error: 'No se encontró un ganador para este número de rifa' });
          }

          // Devolver la información del ganador
          res.json({
            raffleId: winner.raffleId,
            raffleNumberId: winner.raffleNumberId,
            buyerName: winner.buyerName,
            amountBought: winner.amountBought,
            remainingAmount: winner.remainingAmount
          });
        })
        .catch(err => {
          console.error('Error al buscar al ganador:', err);
          res.status(500).json({ error: 'Error al buscar al ganador' });
        });
    })
    .catch(err => {
      console.error('Error al buscar el número de rifa:', err);
      res.status(500).json({ error: 'Error al buscar el número de rifa' });
    });
});

// // Iniciar el servidor en el puerto 3000
// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Servidor corriendo en http://localhost:${port}`);
// });
