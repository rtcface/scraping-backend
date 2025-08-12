// src/services/scraperService.js
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const config = require('../config/config');
const logger = require('../utils/logger');

class ScraperService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch(config.puppeteerConfig);
      logger.info('Browser iniciado');
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser cerrado');
    }
  }

  // Scraping básico con Axios + Cheerio (más rápido)
  async scrapeBasic(url, selector = null) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      if (selector) {
        const elements = [];
        $(selector).each((i, el) => {
          elements.push({
            text: $(el).text().trim(),
            html: $(el).html(),
            attributes: el.attribs
          });
        });
        return { elements, count: elements.length };
      }

      // Extracción básica de metadatos
      return {
        title: $('title').text().trim(),
        description: $('meta[name="description"]').attr('content') || '',
        keywords: $('meta[name="keywords"]').attr('content') || '',
        h1: $('h1').map((i, el) => $(el).text().trim()).get(),
        links: $('a[href]').map((i, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href')
        })).get().slice(0, 50)
      };
    } catch (error) {
      logger.error('Error en scraping básico:', error);
      throw new Error(`Error al hacer scraping: ${error.message}`);
    }
  }

  // Scraping avanzado con Puppeteer (para sitios con JS)
  async scrapeAdvanced(url, options = {}) {
    const { selector, waitFor, screenshot, userAgent } = options;
    let page;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      if (userAgent) {
        await page.setUserAgent(userAgent);
      }

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      if (waitFor) {
        await page.waitForTimeout(waitFor);
      }

      let result = {};

      if (selector) {
        const elements = await page.$$eval(selector, els => 
          els.map(el => ({
            text: el.textContent.trim(),
            html: el.innerHTML,
            tagName: el.tagName
          }))
        );
        result = { elements, count: elements.length };
      } else {
        result = await page.evaluate(() => ({
          title: document.title,
          url: window.location.href,
          description: document.querySelector('meta[name="description"]')?.content || '',
          h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
          bodyText: document.body.textContent.substring(0, 1000)
        }));
      }

      if (screenshot) {
        result.screenshot = await page.screenshot({ 
          encoding: 'base64',
          fullPage: false,
          type: 'png'
        });
      }

      return result;
    } catch (error) {
      logger.error('Error en scraping avanzado:', error);
      throw new Error(`Error al hacer scraping avanzado: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  // Auto-detectar si necesita JS o no
  async smartScrape(url, options = {}) {
    try {
      // Intentar primero con método básico (más rápido)
      logger.info(`Intentando scraping básico para: ${url}`);
      return await this.scrapeBasic(url, options.selector);
    } catch (error) {
      // Si falla, usar Puppeteer
      logger.info(`Scraping básico falló, usando método avanzado para: ${url}`);
      return await this.scrapeAdvanced(url, options);
    }
  }
}

module.exports = ScraperService;