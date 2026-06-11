var gis = require('g-i-s');
gis('Gemfan 3052 propeller', function(error, results) {
  if (error) { console.log("ERROR", error); }
  else { console.log(results[0].url); }
});
