/* =============================================
   BUDGETS PAGE (RF-13, RF-14)
   ============================================= */

const BudgetsPage = {
    async render() {
        const content = document.getElementById('content-area');
        content.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><span class="spinner"></span></div>';

        const budgets = await DataService.getBudgets();
        const categories = await DataService.getCategories();

        // Need to resolve spent for each budget before rendering
        const budgetsData = await Promise.all(budgets.map(async b => {
            const spent = await DataService.getBudgetSpent(b.categoriaId);
            return {
                ...b,
                spent
            };
        }));

        content.innerHTML = `
            <div class="transactions-header" style="margin-bottom: var(--space-6);">
                <p class="text-secondary">Establece límites de gasto por categoría para controlar tus finanzas</p>
                <button class="btn btn-primary" id="btn-add-budget">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Nuevo Presupuesto
                </button>
            </div>
            <div class="budgets-list">
                ${budgetsData.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon">💰</div>
                        <div class="empty-state-text">No tienes presupuestos configurados</div>
                        <button class="btn btn-primary" onclick="BudgetsPage.openAddModal()">Crear primer presupuesto</button>
                    </div>
                ` : budgetsData.map(budget => {
                    const cat = categories.find(c => c.id === budget.categoriaId);
                    if (!cat) return '';
                    const spent = budget.spent;
                    const percentage = budget.limite > 0 ? (spent / budget.limite) * 100 : 0;
                    const isWarning = percentage >= 80 && percentage < 100;
                    const isDanger = percentage >= 100;
                    const progressClass = isDanger ? 'danger' : isWarning ? 'warning' : 'success';

                    return `
                        <div class="budget-item">
                            <div class="budget-header">
                                <div class="budget-left">
                                    <div class="budget-icon" style="background: ${cat.color}20;">
                                        ${cat.icono}
                                    </div>
                                    <div>
                                        <div class="budget-name">${cat.nombre}</div>
                                        <div class="text-xs text-tertiary">Presupuesto mensual</div>
                                    </div>
                                </div>
                                <div style="display:flex;align-items:center;gap:var(--space-3);">
                                    <div class="budget-amounts">
                                        <div class="budget-spent ${isDanger ? 'amount-negative' : ''}">${Helpers.formatCurrency(spent)}</div>
                                        <div class="budget-limit">de ${Helpers.formatCurrency(budget.limite)}</div>
                                    </div>
                                    <div class="actions-cell">
                                        <button class="btn btn-ghost btn-icon btn-sm" onclick="BudgetsPage.openEditModal('${budget.id}')" title="Editar">✏️</button>
                                        <button class="btn btn-ghost btn-icon btn-sm" onclick="BudgetsPage.deleteBudget('${budget.id}')" title="Eliminar">🗑️</button>
                                    </div>
                                </div>
                            </div>
                            <div class="budget-progress-row">
                                <div class="progress" style="flex:1;">
                                    <div class="progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                                </div>
                                <span class="budget-percentage" style="color: var(--${progressClass});">
                                    ${percentage.toFixed(0)}%
                                </span>
                            </div>
                            ${isWarning ? '<div class="badge badge-warning" style="margin-top:var(--space-2);">⚠️ Cerca del límite</div>' : ''}
                            ${isDanger ? '<div class="badge badge-danger" style="margin-top:var(--space-2);">🚨 Presupuesto excedido</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('btn-add-budget')?.addEventListener('click', () => this.openAddModal());
    },

    async getFormHtml(budget = null) {
        const categories = await DataService.getCategories();
        const existingBudgets = await DataService.getBudgets();
        const availableCategories = budget
            ? categories
            : categories.filter(c => !existingBudgets.find(b => b.categoriaId === c.id));
        const isEdit = !!budget;

        return `
            <form id="budget-form">
                <div class="form-group">
                    <label class="form-label">Categoría</label>
                    <select class="form-input" name="categoriaId" required ${isEdit ? 'disabled' : ''}>
                        <option value="">Seleccionar categoría</option>
                        ${availableCategories.map(c => `
                            <option value="${c.id}" ${budget?.categoriaId === c.id ? 'selected' : ''}>
                                ${c.icono} ${c.nombre}
                            </option>
                        `).join('')}
                    </select>
                    ${isEdit ? `<input type="hidden" name="categoriaId" value="${budget.categoriaId}">` : ''}
                </div>
                <div class="form-group">
                    <label class="form-label">Límite Mensual</label>
                    <input type="number" class="form-input" name="limite" step="0.01" min="1" required
                           value="${budget?.limite || ''}" placeholder="0.00">
                </div>
                <div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);">
                    <button type="button" class="btn btn-secondary" onclick="Helpers.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btn-submit-form">${isEdit ? 'Guardar' : 'Crear Presupuesto'}</button>
                </div>
            </form>
        `;
    },

    async openAddModal() {
        Helpers.openModal('Nuevo Presupuesto', await this.getFormHtml());
        this.bindFormEvents();
    },

    async openEditModal(id) {
        const budgets = await DataService.getBudgets();
        const budget = budgets.find(b => b.id === id);
        if (!budget) return;
        Helpers.openModal('Editar Presupuesto', await this.getFormHtml(budget));
        this.bindFormEvents(id);
    },

    bindFormEvents(editId = null) {
        const form = document.getElementById('budget-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-form');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>';
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                if (editId) {
                    await DataService.updateBudget(editId, data);
                    Helpers.showToast('Presupuesto actualizado');
                } else {
                    await DataService.addBudget(data);
                    Helpers.showToast('Presupuesto creado');
                }
                Helpers.closeModal();
                await this.render();
            } catch (error) {
                Helpers.showToast('Error: ' + error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = 'Reintentar';
            }
        });
    },

    async deleteBudget(id) {
        if (confirm('¿Eliminar este presupuesto?')) {
            try {
                await DataService.deleteBudget(id);
                Helpers.showToast('Presupuesto eliminado', 'warning');
                await this.render();
            } catch (error) {
                Helpers.showToast('Error: ' + error.message, 'error');
            }
        }
    }
};
