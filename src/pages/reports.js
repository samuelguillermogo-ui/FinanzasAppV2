/* =============================================
   REPORTS PAGE (RF-15, RF-16)
   ============================================= */

const ReportsPage = {
    async render() {
        const content = document.getElementById('content-area');
        content.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><span class="spinner"></span></div>';

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const totals = await DataService.getMonthlyTotals(currentYear, currentMonth);
        const categories = await DataService.getCategories();

        // Get expenses by category for current month
        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
        const expByCategory = await DataService.getExpensesByCategory(startOfMonth, endOfMonth);

        // Sort categories by expense amount
        const sortedCategories = Object.entries(expByCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([catId, amount]) => {
                const cat = categories.find(c => c.id === catId);
                return cat ? { ...cat, totalGasto: amount } : null;
            })
            .filter(Boolean);

        const totalGastos = sortedCategories.reduce((s, c) => s + c.totalGasto, 0);

        content.innerHTML = `
            <div class="transactions-header" style="margin-bottom: var(--space-6);">
                <div>
                    <p class="text-secondary">Reporte de ${Helpers.getFullMonthName(currentMonth)} ${currentYear}</p>
                </div>
                <button class="btn btn-primary" id="btn-export-csv" tabindex="0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Exportar CSV
                </button>
            </div>

            <!-- Summary Cards -->
            <div class="report-summary">
                <div class="metric-card">
                    <div class="metric-icon" style="background: rgba(39,174,96,0.1);">📈</div>
                    <div class="metric-label">Total Ingresos</div>
                    <div class="metric-value" style="color: var(--success);">${Helpers.formatCurrency(totals.ingresos)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon" style="background: rgba(235,87,87,0.1);">📉</div>
                    <div class="metric-label">Total Gastos</div>
                    <div class="metric-value" style="color: var(--danger);">${Helpers.formatCurrency(totals.gastos)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon" style="background: rgba(47,128,237,0.1);">💰</div>
                    <div class="metric-label">Ahorro Neto</div>
                    <div class="metric-value" style="color: ${totals.ahorro >= 0 ? 'var(--info)' : 'var(--danger)'};">
                        ${Helpers.formatCurrency(totals.ahorro)}
                    </div>
                </div>
            </div>

            <!-- Charts -->
            <div class="report-chart-grid">
                <div class="chart-card">
                    <div class="card-header">
                        <h3 class="card-title">Resumen del Mes</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="chart-report-bar"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="card-header">
                        <h3 class="card-title">Distribución de Gastos</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="chart-report-donut"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top Categories -->
            <div class="chart-card">
                <div class="card-header">
                    <h3 class="card-title">Categorías Principales</h3>
                </div>
                <div class="top-categories">
                    ${sortedCategories.length === 0 ? '<p class="text-secondary" style="padding: var(--space-4);">No hay gastos registrados este mes</p>' :
                    sortedCategories.map((cat, idx) => {
                        const pct = totalGastos > 0 ? (cat.totalGasto / totalGastos * 100) : 0;
                        return `
                            <div class="top-cat-item">
                                <div class="top-cat-rank">${idx + 1}</div>
                                <span style="font-size:1.25rem;">${cat.icono}</span>
                                <div class="top-cat-info">
                                    <div class="top-cat-name">${cat.nombre}</div>
                                    <div class="top-cat-bar">
                                        <div class="top-cat-bar-fill" style="width:${pct}%;background:${cat.color};"></div>
                                    </div>
                                </div>
                                <div class="top-cat-amount">${Helpers.formatCurrency(cat.totalGasto)}</div>
                                <span class="badge" style="background:${cat.color}15;color:${cat.color};">${pct.toFixed(1)}%</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // Bind export
        document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportCSV());

        // Render charts asynchronously
        await ChartService.createReportBar('chart-report-bar', totals);
        await ChartService.createCategoryDonut('chart-report-donut', startOfMonth, endOfMonth);
    },

    async exportCSV() {
        try {
            const btn = document.getElementById('btn-export-csv');
            if(btn) btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Exportando...';

            const now = new Date();
            const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            
            const transactions = await DataService.getTransactionsByDateRange(startStr, endStr);
            const categories = await DataService.getCategories();

            const exportData = transactions.map(t => {
                const cat = categories.find(c => c.id === t.categoriaId);
                return {
                    Fecha: t.fecha,
                    Tipo: t.tipo,
                    Descripcion: t.descripcion,
                    Categoria: cat ? cat.nombre : 'N/A',
                    Monto: t.monto,
                    MetodoPago: t.metodoPago || t.fuente || ''
                };
            });

            const monthName = Helpers.getFullMonthName(now.getMonth());
            Helpers.exportCSV(exportData, `reporte_${monthName}_${now.getFullYear()}.csv`);
            Helpers.showToast('Reporte exportado en CSV');
            
            if(btn) btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg> Exportar CSV`;
        } catch (error) {
            Helpers.showToast('Error al exportar: ' + error.message, 'error');
            const btn = document.getElementById('btn-export-csv');
            if(btn) btn.innerHTML = 'Reintentar Exportación';
        }
    }
};
