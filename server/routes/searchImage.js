const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Append ' propeller' if not explicitly stated, just to keep image results relevant.
    const searchQuery = query.toLowerCase().includes('propeller') ? query : query + ' propeller';
    
    // Simulate Browser Headers to avoid getting blocked
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    };

    const response = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}`, config);
    const html = response.data;
    
    // Bing image results have the direct link embedded in an murl attribute
    const match = html.match(/murl&quot;:&quot;(https:\/\/[^&"]+)&quot;/);
    
    if (match && match[1]) {
      res.json({ imageUrl: match[1] });
    } else {
      res.json({ imageUrl: null, message: "No image found" });
    }
  } catch (error) {
    console.error("Image search error:", error.message);
    res.status(500).json({ error: "Failed to scrape image search" });
  }
});

module.exports = router;
