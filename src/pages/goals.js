/* =============================================
   GOALS PAGE (RF-11, RF-12)
   ============================================= */

const GoalsPage = {
    async render() {
        const content = document.getElementById('content-area');
        content.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><span class="spinner"></span></div>';
        
        const goals = await DataService.getGoals();

        content.innerHTML = `
            <div class="transactions-header" style="margin-bottom: var(--space-6);">
                <p class="text-secondary">Define y alcanza tus metas de ahorro</p>
                <button class="btn btn-primary" id="btn-add-goal">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Nueva Meta
                </button>
            </div>
            <div class="goals-grid">
                ${goals.length === 0 ? `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <div class="empty-state-icon">🎯</div>
                        <div class="empty-state-text">No tienes metas de ahorro aún</div>
                        <button class="btn btn-primary" onclick="GoalsPage.openAddModal()">Crear primera meta</button>
                    </div>
                ` : goals.map(goal => this.renderGoalCard(goal)).join('')}
            </div>
        `;

        document.getElementById('btn-add-goal')?.addEventListener('click', () => this.openAddModal());
    },

    renderGoalCard(goal) {
        const percentage = goal.montoObjetivo > 0
            ? Math.min((goal.montoActual / goal.montoObjetivo) * 100, 100)
            : 0;
        const daysLeft = Helpers.daysBetween(Helpers.today(), goal.fechaObjetivo);
        const isComplete = percentage >= 100;
        const progressClass = isComplete ? 'success' : percentage > 60 ? '' : percentage > 30 ? 'warning' : 'danger';

        return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-name">${goal.nombre}</div>
                    <div style="display:flex;gap:var(--space-1);">
                        <button class="btn btn-ghost btn-icon btn-sm" onclick="GoalsPage.openEditModal('${goal.id}')" title="Editar">✏️</button>
                        <button class="btn btn-ghost btn-icon btn-sm" onclick="GoalsPage.deleteGoal('${goal.id}')" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <div class="goal-amounts">
                    <span class="goal-current">${Helpers.formatCurrency(goal.montoActual)}</span>
                    <span class="goal-target">de ${Helpers.formatCurrency(goal.montoObjetivo)}</span>
                </div>
                <div class="goal-progress">
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="goal-info">
                    <span class="goal-percentage" style="color: ${isComplete ? 'var(--success)' : 'var(--primary)'}">
                        ${isComplete ? '✓ Completada' : `${percentage.toFixed(1)}%`}
                    </span>
                    <span class="goal-deadline">
                        ${daysLeft > 0 ? `${daysLeft} días restantes` : daysLeft === 0 ? 'Vence hoy' : `Vencida hace ${Math.abs(daysLeft)} días`}
                    </span>
                </div>
                ${!isComplete ? `
                    <div class="goal-add-funds">
                        <input type="number" class="form-input" id="add-funds-${goal.id}" placeholder="Monto" min="1" step="0.01">
                        <button class="btn btn-primary btn-sm" onclick="GoalsPage.addFunds('${goal.id}')" id="btn-add-fund-${goal.id}">+ Agregar</button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    getFormHtml(goal = null) {
        const isEdit = !!goal;
        return `
            <form id="goal-form">
                <div class="form-group">
                    <label class="form-label">Nombre de la Meta</label>
                    <input type="text" class="form-input" name="nombre" required
                           value="${goal?.nombre || ''}" placeholder="Ej: Viaje a Europa, Fondo de emergencia...">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Monto Objetivo</label>
                        <input type="number" class="form-input" name="montoObjetivo" step="0.01" min="1" required
                               value="${goal?.montoObjetivo || ''}" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ahorro Actual</label>
                        <input type="number" class="form-input" name="montoActual" step="0.01" min="0"
                               value="${goal?.montoActual || 0}" placeholder="0.00">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha Objetivo</label>
                    <input type="date" class="form-input" name="fechaObjetivo" required
                           value="${goal?.fechaObjetivo || ''}" min="${Helpers.today()}">
                </div>
                <div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);">
                    <button type="button" class="btn btn-secondary" onclick="Helpers.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btn-submit-form">${isEdit ? 'Guardar' : 'Crear Meta'}</button>
                </div>
            </form>
        `;
    },

    openAddModal() {
        Helpers.openModal('Nueva Meta de Ahorro', this.getFormHtml());
        this.bindFormEvents();
    },

    async openEditModal(id) {
        const goals = await DataService.getGoals();
        const goal = goals.find(g => g.id === id);
        if (!goal) return;
        Helpers.openModal('Editar Meta', this.getFormHtml(goal));
        this.bindFormEvents(id);
    },

    bindFormEvents(editId = null) {
        const form = document.getElementById('goal-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-form');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>';
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                if (editId) {
                    await DataService.updateGoal(editId, data);
                    Helpers.showToast('Meta actualizada');
                } else {
                    await DataService.addGoal(data);
                    Helpers.showToast('Meta creada');
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

    async addFunds(id) {
        const input = document.getElementById(`add-funds-${id}`);
        const btn = document.getElementById(`btn-add-fund-${id}`);
        const amount = parseFloat(input?.value);
        if (!amount || amount <= 0) {
            Helpers.showToast('Ingresa un monto válido', 'error');
            return;
        }
        btn.disabled = true;
        try {
            await DataService.addFundsToGoal(id, amount);
            Helpers.showToast(`+${Helpers.formatCurrency(amount)} agregados a la meta`);
            await this.render();
        } catch (error) {
            Helpers.showToast('Error: ' + error.message, 'error');
            btn.disabled = false;
        }
    },

    async deleteGoal(id) {
        if (confirm('¿Eliminar esta meta de ahorro?')) {
            try {
                await DataService.deleteGoal(id);
                Helpers.showToast('Meta eliminada', 'warning');
                await this.render();
            } catch (error) {
                Helpers.showToast('Error: ' + error.message, 'error');
            }
        }
    }
};
