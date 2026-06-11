const axios = require('axios');
async function searchBing(query) {
  try {
    const res = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query + ' propeller')}`);
    const match = res.data.match(/murl&quot;:&quot;(https:\/\/[^&"]+)&quot;/);
    if (match) {
        console.log("Found:", match[1]);
    } else {
        console.log("No image found");
    }
  } catch (e) {
    console.error(e.message);
  }
}
searchBing('gemfan 3inch');
