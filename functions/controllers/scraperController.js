const ScraperService = require('../services/scraperService');
const logger = require('../utils/logger');

const scraperService = new ScraperService();

const scrapeUrl = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url, selector, waitFor, screenshot, userAgent, advanced } = req.body;
    
    logger.info(`Iniciando scraping para: ${url}`);

    let result;
    
    if (advanced) {
      result = await scraperService.scrapeAdvanced(url, {
        selector,
        waitFor,
        screenshot,
        userAgent
      });
    } else {
      result = await scraperService.smartScrape(url, { selector });
    }

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: result,
      metadata: {
        url,
        scrapedAt: new Date().toISOString(),
        executionTime: `${executionTime}ms`,
        method: advanced ? 'puppeteer' : 'smart'
      }
    });

    logger.info(`Scraping completado para ${url} en ${executionTime}ms`);

  } catch (error) {
    logger.error('Error en scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

const getStatus = (req, res) => {
  res.json({
    success: true,
    status: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
};

module.exports = { scrapeUrl, getStatus };