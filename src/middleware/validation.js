const Joi = require('joi');

const scrapeValidation = Joi.object({
  url: Joi.string().uri().required(),
  selector: Joi.string().optional(),
  waitFor: Joi.number().min(0).max(10000).optional(),
  screenshot: Joi.boolean().optional(),
  userAgent: Joi.string().optional()
});

const validateScrapeRequest = (req, res, next) => {
  const { error } = scrapeValidation.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: error.details[0].message
    });
  }
  next();
};

module.exports = { validateScrapeRequest };