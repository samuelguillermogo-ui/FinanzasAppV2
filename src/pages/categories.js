/* =============================================
   CATEGORIES PAGE (RF-07, RF-08)
   ============================================= */

const CategoriesPage = {
    availableIcons: ['🍔', '🚗', '🏠', '🎬', '💊', '📚', '📱', '📦', '🛒', '✈️', '👔', '💡', '🎵', '⚽', '🐾', '💻', '☕', '🎁', '🔧', '💳', '🏥', '🎲', '🍕', '🚌'],
    availableColors: ['#F2994A', '#2F80ED', '#9B51E0', '#E84393', '#EB5757', '#2D7A4F', '#F2C94C', '#828282', '#27AE60', '#00B8D9', '#FF6B6B', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1'],

    async render() {
        const content = document.getElementById('content-area');
        content.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><span class="spinner"></span></div>';

        const categories = await DataService.getCategories();
        const transactions = await DataService.getTransactions();

        content.innerHTML = `
            <div class="transactions-header" style="margin-bottom: var(--space-6);">
                <p class="text-secondary">Administra las categorías para organizar tus transacciones</p>
            </div>
            <div class="categories-grid">
                ${categories.map(cat => {
                    const count = transactions.filter(t => t.categoriaId === cat.id).length;
                    return `
                        <div class="category-card">
                            <div class="category-card-actions">
                                ${!cat.isDefault ? `
                                    <button class="btn btn-ghost btn-icon btn-sm" onclick="CategoriesPage.openEditModal('${cat.id}')" title="Editar">✏️</button>
                                    <button class="btn btn-ghost btn-icon btn-sm" onclick="CategoriesPage.deleteCategory('${cat.id}')" title="Eliminar">🗑️</button>
                                ` : ''}
                            </div>
                            <div class="category-card-icon" style="background: ${cat.color}20;">
                                ${cat.icono}
                            </div>
                            <div class="category-card-name">${cat.nombre}</div>
                            <div class="category-card-count">${count} transacción${count !== 1 ? 'es' : ''}</div>
                        </div>
                    `;
                }).join('')}
                <div class="add-category-card" onclick="CategoriesPage.openAddModal()" id="add-category-btn">
                    <div class="add-icon">+</div>
                    <div class="text-secondary" style="font-weight:500;">Nueva Categoría</div>
                </div>
            </div>
        `;
    },

    getFormHtml(cat = null) {
        const isEdit = !!cat;
        const selectedIcon = cat?.icono || this.availableIcons[0];
        const selectedColor = cat?.color || this.availableColors[0];

        return `
            <form id="category-form">
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" class="form-input" name="nombre" required
                           value="${cat?.nombre || ''}" placeholder="Nombre de la categoría">
                </div>
                <div class="form-group">
                    <label class="form-label">Icono</label>
                    <div class="icon-picker-grid">
                        ${this.availableIcons.map(icon => `
                            <div class="icon-option ${icon === selectedIcon ? 'selected' : ''}"
                                 data-icon="${icon}" onclick="CategoriesPage.selectIcon(this)">${icon}</div>
                        `).join('')}
                    </div>
                    <input type="hidden" name="icono" value="${selectedIcon}" id="selected-icon">
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid">
                        ${this.availableColors.map(color => `
                            <div class="color-swatch ${color === selectedColor ? 'selected' : ''}"
                                 style="background:${color}" data-color="${color}"
                                 onclick="CategoriesPage.selectColor(this)"></div>
                        `).join('')}
                    </div>
                    <input type="hidden" name="color" value="${selectedColor}" id="selected-color">
                </div>
                <div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);">
                    <button type="button" class="btn btn-secondary" onclick="Helpers.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btn-submit-form">${isEdit ? 'Guardar' : 'Crear Categoría'}</button>
                </div>
            </form>
        `;
    },

    selectIcon(el) {
        document.querySelectorAll('.icon-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('selected-icon').value = el.dataset.icon;
    },

    selectColor(el) {
        document.querySelectorAll('.color-swatch').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('selected-color').value = el.dataset.color;
    },

    openAddModal() {
        Helpers.openModal('Nueva Categoría', this.getFormHtml());
        this.bindFormEvents();
    },

    async openEditModal(id) {
        const cat = await DataService.getCategoryById(id);
        if (!cat) return;
        Helpers.openModal('Editar Categoría', this.getFormHtml(cat));
        this.bindFormEvents(id);
    },

    bindFormEvents(editId = null) {
        const form = document.getElementById('category-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-form');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>';
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                if (editId) {
                    await DataService.updateCategory(editId, data);
                    Helpers.showToast('Categoría actualizada');
                } else {
                    await DataService.addCategory(data);
                    Helpers.showToast('Categoría creada');
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

    async deleteCategory(id) {
        const txs = await DataService.getTransactionsByCategory(id);
        if (txs.length > 0) {
            Helpers.showToast(`No se puede eliminar: tiene ${txs.length} transacciones asociadas`, 'error');
            return;
        }
        if (confirm('¿Eliminar esta categoría?')) {
            try {
                await DataService.deleteCategory(id);
                Helpers.showToast('Categoría eliminada', 'warning');
                await this.render();
            } catch (error) {
                Helpers.showToast('Error: ' + error.message, 'error');
            }
        }
    }
};
