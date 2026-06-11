const PerformanceChart = {
  instance: null,

  render(canvasId, sweepData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.instance) {
      this.instance.destroy();
    }

    const labels = sweepData.map(d => d.J);
    const ctData = sweepData.map(d => d.Ct);
    const cpData = sweepData.map(d => d.Cp * 10); // Scale Cp up 10x for visibility
    const etaData = sweepData.map(d => d.eta);

    // Chart.js global defaults
    Chart.defaults.color = '#8b9bb4';
    Chart.defaults.font.family = "'Inter', sans-serif";

    this.instance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Efficiency (η%)',
            data: etaData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
          },
          {
            label: 'Ct (Thrust Coeff)',
            data: ctData,
            borderColor: '#3b82f6',
            yAxisID: 'y1',
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
          },
          {
            label: '10 × Cp (Power Coeff)',
            data: cpData,
            borderColor: '#f43f5e',
            yAxisID: 'y1',
            tension: 0.4,
            borderWidth: 2,
            borderDash: [2, 2],
            pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, usePointStyle: true }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(16, 21, 45, 0.9)',
            titleColor: '#fff',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Advance Ratio (J)' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Efficiency (%)' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            min: 0, max: 100
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Coefficients' },
            grid: { drawOnChartArea: false },
            min: 0
          }
        }
      }
    });
  },

  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
};
