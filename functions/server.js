const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const logger = require('./utils/logger');
const scraperRoutes = require('./routes/scraperRoutes');
const serverless = require( 'serverless-http');

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    error: 'Demasiadas solicitudes, intenta más tarde'
  }
});
app.use(limiter);

// Parseo JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/.netlify/functions/server/api/v1', scraperRoutes);
const handler = serverless(app);

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

const server = app.listen(config.port, () => {
  logger.info(`🚀 Servidor ejecutándose en puerto ${config.port}`);
  logger.info(`📝 Documentación: http://localhost:${config.port}/api/v1/status`);
});

module.exports = app;
module.exports.handler = handler;