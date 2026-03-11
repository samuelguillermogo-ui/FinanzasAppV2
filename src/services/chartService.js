/* =============================================
   CHART SERVICE - Chart.js helpers
   ============================================= */

const ChartService = {
    chartInstances: {},

    /**
     * Destroy a chart instance if it exists
     */
    destroy(id) {
        if (this.chartInstances[id]) {
            this.chartInstances[id].destroy();
            delete this.chartInstances[id];
        }
    },

    /**
     * Destroy all chart instances
     */
    destroyAll() {
        Object.keys(this.chartInstances).forEach(id => this.destroy(id));
    },

    /**
     * Common chart options
     */
    getDefaultOptions() {
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#616161';
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || 'rgba(0,0,0,0.08)';
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: { family: "'Inter', sans-serif", size: 11, weight: 500 },
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30,35,40,0.95)',
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: 600 },
                    bodyFont: { family: "'Inter', sans-serif", size: 12 },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
                            return ` ${context.dataset.label || context.label}: ${Helpers.formatCurrency(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 11 } }
                },
                y: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: {
                        color: textColor,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        callback: value => Helpers.formatCurrency(value)
                    },
                    beginAtZero: true
                }
            }
        };
    },

    /**
     * Create expense donut chart by category
     */
    async createCategoryDonut(canvasId, startDate, endDate) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const expensesByCategory = await DataService.getExpensesByCategory(startDate, endDate);
        const categories = await DataService.getCategories();

        const labels = [];
        const data = [];
        const colors = [];

        Object.entries(expensesByCategory)
            .sort((a, b) => b[1] - a[1])
            .forEach(([catId, amount]) => {
                const cat = categories.find(c => c.id === catId);
                if (cat) {
                    labels.push(cat.nombre);
                    data.push(amount);
                    colors.push(cat.color);
                }
            });

        if (data.length === 0) {
            labels.push('Sin datos');
            data.push(1);
            colors.push('#E0E0E0');
        }

        this.chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 6,
                    borderRadius: 4,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                            font: { family: "'Inter', sans-serif", size: 11, weight: 500 },
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30,35,40,0.95)',
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: 600 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((context.parsed / total) * 100).toFixed(1);
                                return ` ${context.label}: ${Helpers.formatCurrency(context.parsed)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Create income vs expenses bar chart
     */
    async createIncomeVsExpenseBar(canvasId, monthCount = 6) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const evolution = await DataService.getMonthlyEvolution(monthCount);
        const labels = evolution.map(e => e.month);
        const ingresos = evolution.map(e => e.ingresos);
        const gastos = evolution.map(e => e.gastos);

        const opts = this.getDefaultOptions();

        this.chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresos,
                        backgroundColor: 'rgba(45, 122, 79, 0.8)',
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    },
                    {
                        label: 'Gastos',
                        data: gastos,
                        backgroundColor: 'rgba(235, 87, 87, 0.8)',
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    }
                ]
            },
            options: {
                ...opts,
                plugins: {
                    ...opts.plugins,
                    legend: { ...opts.plugins.legend, position: 'top' }
                }
            }
        });
    },

    /**
     * Create monthly evolution area chart
     */
    async createEvolutionArea(canvasId, monthCount = 6) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const evolution = await DataService.getMonthlyEvolution(monthCount);
        const labels = evolution.map(e => e.month);
        const ahorro = evolution.map(e => e.ahorro);

        const opts = this.getDefaultOptions();

        this.chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Ahorro Neto',
                    data: ahorro,
                    borderColor: '#2D7A4F',
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx: c, chartArea } = chart;
                        if (!chartArea) return 'rgba(45, 122, 79, 0.1)';
                        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(45, 122, 79, 0.3)');
                        gradient.addColorStop(1, 'rgba(45, 122, 79, 0.02)');
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#2D7A4F',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }]
            },
            options: {
                ...opts,
                plugins: {
                    ...opts.plugins,
                    legend: { display: false }
                }
            }
        });
    },

    /**
     * Create report comparison chart
     */
    async createReportBar(canvasId, data) {
        // Doesn't fetch anything but let's make it async for consistency
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const opts = this.getDefaultOptions();

        this.chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ingresos', 'Gastos', 'Ahorro'],
                datasets: [{
                    data: [data.ingresos, data.gastos, data.ahorro],
                    backgroundColor: [
                        'rgba(45, 122, 79, 0.8)',
                        'rgba(235, 87, 87, 0.8)',
                        'rgba(47, 128, 237, 0.8)'
                    ],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                ...opts,
                plugins: { ...opts.plugins, legend: { display: false } },
                indexAxis: 'y'
            }
        });
    }
};
