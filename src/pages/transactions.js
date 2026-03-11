/* =============================================
   TRANSACTIONS PAGE (RF-04, RF-05, RF-06)
   ============================================= */

const TransactionsPage = {
    currentFilters: { tipo: 'todos', categoriaId: 'todos', search: '' },

    async render() {
        const content = document.getElementById('content-area');
        content.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><span class="spinner"></span></div>';
        
        const categories = await DataService.getCategories();
        
        content.innerHTML = `
            <div class="transactions-header">
                <div class="filter-bar">
                    <select class="form-input" id="filter-type">
                        <option value="todos">Todos los tipos</option>
                        <option value="ingreso">Ingresos</option>
                        <option value="gasto">Gastos</option>
                    </select>
                    <select class="form-input" id="filter-category">
                        <option value="todos">Todas las categorías</option>
                        ${categories.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('')}
                    </select>
                    <input type="text" class="form-input" id="filter-search" placeholder="Buscar transacción..." style="min-width: 200px;">
                </div>
                <button class="btn btn-primary" id="btn-add-transaction">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Nueva Transacción
                </button>
            </div>
            <div class="card">
                <div class="table-container" id="transactions-table-container">
                    <div style="text-align:center;padding:2rem;"><span class="spinner"></span></div>
                </div>
            </div>
        `;

        await this.refreshTable();
        this.bindEvents();
    },

    async renderTable() {
        let transactions = await DataService.getTransactions();
        const categories = await DataService.getCategories();
        const f = this.currentFilters;

        // Apply filters
        if (f.tipo !== 'todos') transactions = transactions.filter(t => t.tipo === f.tipo);
        if (f.categoriaId !== 'todos') transactions = transactions.filter(t => t.categoriaId === f.categoriaId);
        if (f.search) {
            const s = f.search.toLowerCase();
            transactions = transactions.filter(t => t.descripcion.toLowerCase().includes(s));
        }

        if (transactions.length === 0) {
            return `<div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No se encontraron transacciones</div>
                <button class="btn btn-primary" onclick="TransactionsPage.openAddModal()">Agregar primera transacción</button>
            </div>`;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Método</th>
                        <th>Monto</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(tx => {
                        const cat = categories.find(c => c.id === tx.categoriaId);
                        const isIncome = tx.tipo === 'ingreso';
                        return `
                            <tr>
                                <td>${Helpers.formatDate(tx.fecha)}</td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <span style="font-size:1.1rem;">${cat ? cat.icono : '💵'}</span>
                                        <strong>${tx.descripcion}</strong>
                                    </div>
                                </td>
                                <td>
                                    ${cat ? `<span class="category-tag" style="background:${cat.color}15;color:${cat.color}">
                                        <span class="category-dot" style="background:${cat.color}"></span>
                                        ${cat.nombre}
                                    </span>` : '<span class="badge badge-success">Ingreso</span>'}
                                </td>
                                <td class="text-secondary">${tx.metodoPago || tx.fuente || '—'}</td>
                                <td class="${isIncome ? 'amount-positive' : 'amount-negative'}">
                                    ${isIncome ? '+' : '-'}${Helpers.formatCurrency(tx.monto)}
                                </td>
                                <td>
                                    <div class="actions-cell">
                                        <button class="btn btn-ghost btn-icon" onclick="TransactionsPage.openEditModal('${tx.id}')" title="Editar">✏️</button>
                                        <button class="btn btn-ghost btn-icon" onclick="TransactionsPage.deleteTransaction('${tx.id}')" title="Eliminar">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    bindEvents() {
        document.getElementById('btn-add-transaction')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('filter-type')?.addEventListener('change', (e) => {
            this.currentFilters.tipo = e.target.value;
            this.refreshTable();
        });
        document.getElementById('filter-category')?.addEventListener('change', (e) => {
            this.currentFilters.categoriaId = e.target.value;
            this.refreshTable();
        });
        document.getElementById('filter-search')?.addEventListener('input', Helpers.debounce((e) => {
            this.currentFilters.search = e.target.value;
            this.refreshTable();
        }, 200));
    },

    async refreshTable() {
        const container = document.getElementById('transactions-table-container');
        if (container) container.innerHTML = await this.renderTable();
    },

    async getFormHtml(tx = null) {
        const categories = await DataService.getCategories();
        const isEdit = !!tx;
        const tipo = tx?.tipo || 'gasto';

        return `
            <form id="transaction-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Tipo</label>
                        <select class="form-input" name="tipo" required id="tx-tipo">
                            <option value="gasto" ${tipo === 'gasto' ? 'selected' : ''}>Gasto</option>
                            <option value="ingreso" ${tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Monto</label>
                        <input type="number" class="form-input" name="monto" step="0.01" min="0.01" required
                               value="${tx?.monto || ''}" placeholder="0.00">
                    </div>
                </div>
                <div class="form-group" id="tx-category-group">
                    <label class="form-label">Categoría</label>
                    <select class="form-input" name="categoriaId">
                        <option value="">Seleccionar categoría</option>
                        ${categories.map(c => `<option value="${c.id}" ${tx?.categoriaId === c.id ? 'selected' : ''}>${c.icono} ${c.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" id="tx-fuente-group" style="display:${tipo === 'ingreso' ? 'block' : 'none'}">
                    <label class="form-label">Fuente</label>
                    <input type="text" class="form-input" name="fuente" value="${tx?.fuente || ''}" placeholder="Ej: Salario, Freelance...">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fecha</label>
                        <input type="date" class="form-input" name="fecha" required
                               value="${tx ? Helpers.formatDateInput(tx.fecha) : Helpers.today()}">
                    </div>
                    <div class="form-group" id="tx-metodo-group">
                        <label class="form-label">Método de Pago</label>
                        <select class="form-input" name="metodoPago">
                            <option value="Efectivo" ${tx?.metodoPago === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                            <option value="Tarjeta débito" ${tx?.metodoPago === 'Tarjeta débito' ? 'selected' : ''}>Tarjeta débito</option>
                            <option value="Tarjeta crédito" ${tx?.metodoPago === 'Tarjeta crédito' ? 'selected' : ''}>Tarjeta crédito</option>
                            <option value="Transferencia" ${tx?.metodoPago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                        <label class="form-label">Descripción</label>
                    <input type="text" class="form-input" name="descripcion" required
                           value="${tx?.descripcion || ''}" placeholder="Descripción de la transacción">
                </div>
                <div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);">
                    <button type="button" class="btn btn-secondary" onclick="Helpers.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btn-submit-form">
                        <span class="btn-text">${isEdit ? 'Guardar Cambios' : 'Agregar Transacción'}</span>
                    </button>
                </div>
            </form>
        `;
    },

    async openAddModal() {
        Helpers.openModal('Nueva Transacción', await this.getFormHtml());
        this.bindFormEvents();
    },

    async openEditModal(id) {
        const txs = await DataService.getTransactions();
        const tx = txs.find(t => t.id === id);
        if (!tx) return;
        Helpers.openModal('Editar Transacción', await this.getFormHtml(tx));
        this.bindFormEvents(id);
    },

    bindFormEvents(editId = null) {
        const form = document.getElementById('transaction-form');
        const tipoSelect = document.getElementById('tx-tipo');

        tipoSelect?.addEventListener('change', (e) => {
            const isIngreso = e.target.value === 'ingreso';
            const catGroup = document.getElementById('tx-category-group');
            const fuenteGroup = document.getElementById('tx-fuente-group');
            const metodoGroup = document.getElementById('tx-metodo-group');
            if (fuenteGroup) fuenteGroup.style.display = isIngreso ? 'block' : 'none';
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-form');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>';
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                if (editId) {
                    await DataService.updateTransaction(editId, data);
                    Helpers.showToast('Transacción actualizada');
                } else {
                    await DataService.addTransaction(data);
                    Helpers.showToast('Transacción agregada');
                }
                Helpers.closeModal();
                await this.refreshTable();
            } catch (error) {
                Helpers.showToast('Error: ' + error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = 'Reintentar';
            }
        });
    },

    async deleteTransaction(id) {
        if (confirm('¿Eliminar esta transacción?')) {
            try {
                await DataService.deleteTransaction(id);
                Helpers.showToast('Transacción eliminada', 'warning');
                await this.refreshTable();
            } catch (error) {
                Helpers.showToast('Error: ' + error.message, 'error');
            }
        }
    }
};
