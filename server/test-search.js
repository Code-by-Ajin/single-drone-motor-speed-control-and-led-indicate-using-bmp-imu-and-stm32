const axios = require('axios');
async function searchImage(query) {
  try {
    const res = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' propeller')}`);
    const html = res.data;
    const match = html.match(/<img class="result__icon__img" src="\/\/([^"]+)"/);
    if (match) {
        console.log("Found:", "https://" + match[1]);
    } else {
        console.log("No image found in DDG HTML");
    }
  } catch (e) {
    console.error(e.message);
  }
}
searchImage('gemfan 3inch');
