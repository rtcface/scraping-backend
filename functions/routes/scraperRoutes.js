const express = require('express');
const { scrapeUrl, getStatus } = require('../controllers/scraperController');
const { validateScrapeRequest } = require('../middleware/validation');

const router = express.Router();


const { scrapeAllCategories } = require('../controllers/scraperController');

router.get('/status', getStatus);
router.post('/scrape', validateScrapeRequest, scrapeUrl);
router.get('/scrape/all', scrapeAllCategories);

module.exports = router;