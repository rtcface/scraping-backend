
// src/utils/logger.js
const winston = require('winston');
const path = require('path'); // Es una buena práctica usar path.join


const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join('/tmp', 'error.log') }),
    new winston.transports.File({ filename: path.join('/tmp', 'combined.log') })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;