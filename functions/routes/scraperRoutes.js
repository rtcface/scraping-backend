const express = require('express');
const { scrapeUrl, getStatus } = require('../controllers/scraperController');
const { validateScrapeRequest } = require('../middleware/validation');

const router = express.Router();

router.get('/status', getStatus);
router.post('/scrape', validateScrapeRequest, scrapeUrl);

module.exports = router;