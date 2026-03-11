/* =============================================
   DASHBOARD PAGE (RF-09, RF-10)
   ============================================= */

const DashboardPage = {
    async render() {
        const content = document.getElementById('content-area');
        content.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><span class="spinner"></span></div>';

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const totals = await DataService.getMonthlyTotals(currentYear, currentMonth);
        const balance = await DataService.getTotalBalance();
        const prevTotals = await DataService.getMonthlyTotals(currentYear, currentMonth - 1);

        // Calculate changes
        const incomeChange = prevTotals.ingresos > 0 ? ((totals.ingresos - prevTotals.ingresos) / prevTotals.ingresos * 100).toFixed(1) : 0;
        const expenseChange = prevTotals.gastos > 0 ? ((totals.gastos - prevTotals.gastos) / prevTotals.gastos * 100).toFixed(1) : 0;
        const savingsChange = prevTotals.ahorro !== 0 ? ((totals.ahorro - prevTotals.ahorro) / Math.abs(prevTotals.ahorro) * 100).toFixed(1) : 0;

        // Recent transactions
        const allTx = await DataService.getTransactions();
        const recentTx = allTx.slice(0, 6);
        const categories = await DataService.getCategories();

        // Date range for charts (current month)
        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

        content.innerHTML = `
            <!-- Metric Cards -->
            <div class="metrics-grid">
                <div class="metric-card" id="metric-balance">
                    <div class="metric-icon" style="background: rgba(45,122,79,0.1);">💰</div>
                    <div class="metric-label">Balance Total</div>
                    <div class="metric-value">${Helpers.formatCurrency(balance)}</div>
                    <div class="metric-progress">
                        <div class="metric-progress-bar" style="width: 100%; background: var(--primary);"></div>
                    </div>
                </div>
                <div class="metric-card" id="metric-income">
                    <div class="metric-icon" style="background: rgba(39,174,96,0.1);">📈</div>
                    <div class="metric-label">Ingresos del Mes</div>
                    <div class="metric-value">${Helpers.formatCurrency(totals.ingresos)}</div>
                    <span class="metric-change ${parseFloat(incomeChange) >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(incomeChange) >= 0 ? '↑' : '↓'} ${Math.abs(incomeChange)}%
                    </span>
                </div>
                <div class="metric-card" id="metric-expenses">
                    <div class="metric-icon" style="background: rgba(235,87,87,0.1);">📉</div>
                    <div class="metric-label">Gastos del Mes</div>
                    <div class="metric-value">${Helpers.formatCurrency(totals.gastos)}</div>
                    <span class="metric-change ${parseFloat(expenseChange) <= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(expenseChange) >= 0 ? '↑' : '↓'} ${Math.abs(expenseChange)}%
                    </span>
                </div>
                <div class="metric-card" id="metric-savings">
                    <div class="metric-icon" style="background: rgba(47,128,237,0.1);">🎯</div>
                    <div class="metric-label">Ahorro del Mes</div>
                    <div class="metric-value">${Helpers.formatCurrency(totals.ahorro)}</div>
                    <span class="metric-change ${totals.ahorro >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(savingsChange) >= 0 ? '↑' : '↓'} ${Math.abs(savingsChange)}%
                    </span>
                </div>
            </div>

            <!-- Charts Row 1 -->
            <div class="charts-grid">
                <div class="chart-card">
                    <div class="card-header">
                        <h3 class="card-title">Ingresos vs Gastos</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="chart-income-expense"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="card-header">
                        <h3 class="card-title">Gastos por Categoría</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="chart-category-donut"></canvas>
                    </div>
                </div>
            </div>

            <!-- Charts Row 2 + Recent Transactions -->
            <div class="charts-grid">
                <div class="chart-card">
                    <div class="card-header">
                        <h3 class="card-title">Evolución Mensual</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="chart-evolution"></canvas>
                    </div>
                </div>
                <div class="chart-card recent-transactions">
                    <div class="card-header">
                        <h3 class="card-title">Últimas Transacciones</h3>
                        <a href="#transactions" class="btn btn-ghost btn-sm">Ver todas →</a>
                    </div>
                    ${recentTx.map(tx => {
                        const cat = categories.find(c => c.id === tx.categoriaId);
                        const isIncome = tx.tipo === 'ingreso';
                        return `
                            <div class="transaction-item">
                                <div class="transaction-icon" style="background: ${cat ? cat.color + '15' : 'rgba(39,174,96,0.1)'};">
                                    ${cat ? cat.icono : '💵'}
                                </div>
                                <div class="transaction-details">
                                    <div class="transaction-name">${tx.descripcion}</div>
                                    <div class="transaction-category">${cat ? cat.nombre : 'Ingreso'} · ${Helpers.formatDate(tx.fecha)}</div>
                                </div>
                                <div class="transaction-amount ${isIncome ? 'amount-positive' : 'amount-negative'}">
                                    ${isIncome ? '+' : '-'}${Helpers.formatCurrency(tx.monto)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                    ${recentTx.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No hay transacciones aún</div></div>' : ''}
                </div>
            </div>
        `;

        // Render charts asynchronously
        await ChartService.createIncomeVsExpenseBar('chart-income-expense', 6);
        await ChartService.createCategoryDonut('chart-category-donut', startOfMonth, endOfMonth);
        await ChartService.createEvolutionArea('chart-evolution', 6);
    }
};
