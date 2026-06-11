const State = {
  // Application Data state
  data: {
    input: {
      elevation: 0,
      temperature: 25,
      airSpeed: 0,
      
      diameter: 10,
      pitch: 4.5,
      blades: 2,
      thickness: 15,
      rpm: 10000,
      
      droneMotors: 4,
      yokeWidth: 0,
      yokeTwist: 0,
      spinner: 30,
      maxRPM: 12000,
      testVolt: 14.8,
      
      rootAirfoil: 'NACA 4412',
      tipAirfoil: 'Clark Y',
      
      bladeGeometry: {
        maxChord: 12.5,
        fromHub: 20,
        overhang: 2.5,
        chord27: 10.5,
        thickness27: 2.1,
        trailingTip: 4.5
      }
    },
    results: null,
    sweep: null
  },

  updateInput(key, value) {
    if (key.includes('.')) {
      const parts = key.split('.');
      if (this.data.input[parts[0]]) {
        this.data.input[parts[0]][parts[1]] = value;
      }
    } else {
      this.data.input[key] = value;
    }
  },

  setResults(results, sweep) {
    this.data.results = results;
    this.data.sweep = sweep;
  }
};

window.State = State;
