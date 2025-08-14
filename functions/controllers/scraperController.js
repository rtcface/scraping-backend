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


const urls = require('../config/api-urls');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Utilidades de procesamiento (basadas en example.jsx)
function extractImgUrl(html) {
  if (!html) return '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function cleanText(text) {
  return text.replace(/\*Color No Seleccionable/g, '').trim();
}

function extractReference(text) {
  const refRegex = /Referencia:\s*(\d+)/;
  const refMatch = text.match(refRegex);
  if (refMatch) {
    const referencia = refMatch[1];
    const refEndIdx = text.indexOf(refMatch[0]) + refMatch[0].length;
    const contenido = (text.slice(0, text.indexOf(refMatch[0])) + text.slice(refEndIdx)).trim();
    return { referencia, contenido };
  }
  return { referencia: '', contenido: text.trim() };
}

function splitProductPrice(contenido) {
  const dollarIdx1 = contenido.indexOf('$');
  if (dollarIdx1 !== -1) {
    const producto = contenido.slice(0, dollarIdx1).trim();
    const resto = contenido.slice(dollarIdx1).trim();
    const dollarIdx2 = resto.indexOf('$', 1); // busca el segundo $
    if (dollarIdx2 !== -1) {
      const precioUno = resto.slice(0, dollarIdx2).trim();
      let precioDos = resto.slice(dollarIdx2).trim();
      // Limpia precioDos: deja solo hasta el último número decimal
      const decimalMatch = precioDos.match(/(\d+\.\d{2})/g);
      if (decimalMatch && decimalMatch.length > 0) {
        const lastDecimal = decimalMatch[decimalMatch.length - 1];
        const idx = precioDos.lastIndexOf(lastDecimal) + lastDecimal.length;
        precioDos = precioDos.slice(0, idx).trim();
      }
      return { producto, precioUno, precioDos };
    } else {
      return { producto, precioUno: resto, precioDos: '' };
    }
  }
  return { producto: contenido, precioUno: '', precioDos: '' };
}

// Endpoint para scraping masivo
const scrapeAllCategories = async (req, res) => {
  try {
    const allResults = [];
    for (const { url: baseUrl, name } of urls) {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const url = baseUrl + (baseUrl.includes('?') ? `&page=${page}` : `?page=${page}`);
        // Espera 2 segundos entre peticiones
        if (page > 1 || allResults.length > 0) await sleep(2000);
        let result;
        try {
          result = await scraperService.smartScrape(url, { selector: '.vtex-product-summary-2-x-element' });
        } catch (err) {
          logger.error(`Error scraping ${url}:`, err);
          break;
        }
        if (!result || !result.elements || result.elements.length === 0) {
          hasMore = false;
          break;
        }
        for (const item of result.elements) {
          const cleaned = cleanText(item.text);
          const { referencia, contenido } = extractReference(cleaned);
          const { producto, precioUno } = splitProductPrice(contenido);
          const imgUrl = extractImgUrl(item.html);
          allResults.push({
            id: referencia ? Number(referencia) : null,
            nombre: producto,
            precio: precioUno ? Number(precioUno.replace(/[^0-9.,]/g, '').replace(',', '.')) : null,
            imagen: imgUrl,
            categoria: name,
            url: baseUrl
          });
        }
        page++;
      }
    }
    // Construye el JSON sin comillas en las claves
    const jsonString = JSON.stringify(allResults, null, 2).replace(/"(\w+)":/g, '$1:');
    res.setHeader('Content-Type', 'application/json');
    res.send(jsonString);
  } catch (error) {
    logger.error('Error en scraping masivo:', error);
    res.status(500).json({ success: false, error: 'Error interno en scraping masivo', message: error.message });
  }
};

module.exports = { scrapeUrl, getStatus, scrapeAllCategories };