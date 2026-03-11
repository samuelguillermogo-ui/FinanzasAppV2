/* =============================================
   DATA SERVICE - Supabase + localStorage fallback
   Dual-mode: Supabase for authenticated users,
   localStorage for guest/demo mode
   ============================================= */

const DataService = {
    useLocalStorage: false,

    KEYS: {
        TRANSACTIONS: 'finanzapp_transactions',
        CATEGORIES: 'finanzapp_categories',
        GOALS: 'finanzapp_goals',
        BUDGETS: 'finanzapp_budgets',
        SETTINGS: 'finanzapp_settings',
        INITIALIZED: 'finanzapp_initialized'
    },

    // ==========================================
    // PRIVATE STORAGE HELPERS (localStorage)
    // ==========================================
    _get(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch { return []; }
    },

    _set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    _getUserId() {
        return AuthService.getUserId();
    },

    // ==========================================
    // CATEGORIES
    // ==========================================
    async getCategories() {
        if (this.useLocalStorage) {
            return this._get(this.KEYS.CATEGORIES);
        }
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) { console.error('getCategories error:', error); return []; }
        // Map DB columns to app format
        return data.map(c => ({
            id: c.id,
            nombre: c.nombre,
            icono: c.icono,
            color: c.color,
            isDefault: c.is_default,
            createdAt: c.created_at
        }));
    },

    async getCategoryById(id) {
        if (this.useLocalStorage) {
            return this._get(this.KEYS.CATEGORIES).find(c => c.id === id);
        }
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return {
            id: data.id,
            nombre: data.nombre,
            icono: data.icono,
            color: data.color,
            isDefault: data.is_default,
            createdAt: data.created_at
        };
    },

    async addCategory(category) {
        if (this.useLocalStorage) {
            const categories = this._get(this.KEYS.CATEGORIES);
            const newCat = { id: Helpers.uuid(), ...category, createdAt: new Date().toISOString() };
            categories.push(newCat);
            this._set(this.KEYS.CATEGORIES, categories);
            return newCat;
        }
        const { data, error } = await supabase
            .from('categories')
            .insert({
                user_id: this._getUserId(),
                nombre: category.nombre,
                icono: category.icono || '📦',
                color: category.color || '#828282',
                is_default: false
            })
            .select()
            .single();
        if (error) throw error;
        return { id: data.id, nombre: data.nombre, icono: data.icono, color: data.color, isDefault: data.is_default, createdAt: data.created_at };
    },

    async updateCategory(id, updates) {
        if (this.useLocalStorage) {
            const categories = this._get(this.KEYS.CATEGORIES);
            const idx = categories.findIndex(c => c.id === id);
            if (idx !== -1) { categories[idx] = { ...categories[idx], ...updates }; }
            this._set(this.KEYS.CATEGORIES, categories);
            return;
        }
        const dbUpdates = {};
        if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre;
        if (updates.icono !== undefined) dbUpdates.icono = updates.icono;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        const { error } = await supabase
            .from('categories')
            .update(dbUpdates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteCategory(id) {
        if (this.useLocalStorage) {
            const categories = this._get(this.KEYS.CATEGORIES).filter(c => c.id !== id);
            this._set(this.KEYS.CATEGORIES, categories);
            return;
        }
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // ==========================================
    // TRANSACTIONS
    // ==========================================
    async getTransactions() {
        if (this.useLocalStorage) {
            return this._get(this.KEYS.TRANSACTIONS).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('fecha', { ascending: false });
        if (error) { console.error('getTransactions error:', error); return []; }
        return data.map(t => ({
            id: t.id,
            tipo: t.tipo,
            monto: parseFloat(t.monto),
            categoriaId: t.categoria_id,
            fecha: t.fecha,
            descripcion: t.descripcion,
            metodoPago: t.metodo_pago,
            fuente: t.fuente,
            createdAt: t.created_at
        }));
    },

    async getTransactionsByType(tipo) {
        const transactions = await this.getTransactions();
        return transactions.filter(t => t.tipo === tipo);
    },

    async getTransactionsByCategory(categoryId) {
        const transactions = await this.getTransactions();
        return transactions.filter(t => t.categoriaId === categoryId);
    },

    async getTransactionsByDateRange(startDate, endDate) {
        if (this.useLocalStorage) {
            return this._get(this.KEYS.TRANSACTIONS).filter(t => {
                const d = new Date(t.fecha);
                return d >= new Date(startDate) && d <= new Date(endDate);
            }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });
        if (error) { console.error('getTransactionsByDateRange error:', error); return []; }
        return data.map(t => ({
            id: t.id,
            tipo: t.tipo,
            monto: parseFloat(t.monto),
            categoriaId: t.categoria_id,
            fecha: t.fecha,
            descripcion: t.descripcion,
            metodoPago: t.metodo_pago,
            fuente: t.fuente,
            createdAt: t.created_at
        }));
    },

    async addTransaction(transaction) {
        if (this.useLocalStorage) {
            const transactions = this._get(this.KEYS.TRANSACTIONS);
            const newTx = {
                id: Helpers.uuid(),
                ...transaction,
                monto: parseFloat(transaction.monto),
                createdAt: new Date().toISOString()
            };
            transactions.push(newTx);
            this._set(this.KEYS.TRANSACTIONS, transactions);
            return newTx;
        }
        const { data, error } = await supabase
            .from('transactions')
            .insert({
                user_id: this._getUserId(),
                tipo: transaction.tipo,
                monto: parseFloat(transaction.monto),
                categoria_id: transaction.categoriaId || null,
                fecha: transaction.fecha,
                descripcion: transaction.descripcion || '',
                metodo_pago: transaction.metodoPago || null,
                fuente: transaction.fuente || null
            })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            tipo: data.tipo,
            monto: parseFloat(data.monto),
            categoriaId: data.categoria_id,
            fecha: data.fecha,
            descripcion: data.descripcion,
            metodoPago: data.metodo_pago,
            fuente: data.fuente,
            createdAt: data.created_at
        };
    },

    async updateTransaction(id, updates) {
        if (this.useLocalStorage) {
            const transactions = this._get(this.KEYS.TRANSACTIONS);
            const idx = transactions.findIndex(t => t.id === id);
            if (idx !== -1) {
                if (updates.monto) updates.monto = parseFloat(updates.monto);
                transactions[idx] = { ...transactions[idx], ...updates };
            }
            this._set(this.KEYS.TRANSACTIONS, transactions);
            return;
        }
        const dbUpdates = {};
        if (updates.tipo !== undefined) dbUpdates.tipo = updates.tipo;
        if (updates.monto !== undefined) dbUpdates.monto = parseFloat(updates.monto);
        if (updates.categoriaId !== undefined) dbUpdates.categoria_id = updates.categoriaId;
        if (updates.fecha !== undefined) dbUpdates.fecha = updates.fecha;
        if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
        if (updates.metodoPago !== undefined) dbUpdates.metodo_pago = updates.metodoPago;
        if (updates.fuente !== undefined) dbUpdates.fuente = updates.fuente;
        const { error } = await supabase
            .from('transactions')
            .update(dbUpdates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteTransaction(id) {
        if (this.useLocalStorage) {
            const transactions = this._get(this.KEYS.TRANSACTIONS).filter(t => t.id !== id);
            this._set(this.KEYS.TRANSACTIONS, transactions);
            return;
        }
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // ==========================================
    // GOALS
    // ==========================================
    async getGoals() {
        if (this.useLocalStorage) {
            return this._get(this.KEYS.GOALS);
        }
        const { data, error } = await supabase
            .from('goals')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) { console.error('getGoals error:', error); return []; }
        return data.map(g => ({
            id: g.id,
            nombre: g.nombre,
            montoObjetivo: parseFloat(g.monto_objetivo),
            montoActual: parseFloat(g.monto_actual),
            fechaObjetivo: g.fecha_objetivo,
            createdAt: g.created_at
        }));
    },

    async addGoal(goal) {
        if (this.useLocalStorage) {
            const goals = this._get(this.KEYS.GOALS);
            const newGoal = {
                id: Helpers.uuid(),
                ...goal,
                montoObjetivo: parseFloat(goal.montoObjetivo),
                montoActual: parseFloat(goal.montoActual || 0),
                createdAt: new Date().toISOString()
            };
            goals.push(newGoal);
            this._set(this.KEYS.GOALS, goals);
            return newGoal;
        }
        const { data, error } = await supabase
            .from('goals')
            .insert({
                user_id: this._getUserId(),
                nombre: goal.nombre,
                monto_objetivo: parseFloat(goal.montoObjetivo),
                monto_actual: parseFloat(goal.montoActual || 0),
                fecha_objetivo: goal.fechaObjetivo || null
            })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            nombre: data.nombre,
            montoObjetivo: parseFloat(data.monto_objetivo),
            montoActual: parseFloat(data.monto_actual),
            fechaObjetivo: data.fecha_objetivo,
            createdAt: data.created_at
        };
    },

    async updateGoal(id, updates) {
        if (this.useLocalStorage) {
            const goals = this._get(this.KEYS.GOALS);
            const idx = goals.findIndex(g => g.id === id);
            if (idx !== -1) {
                if (updates.montoObjetivo) updates.montoObjetivo = parseFloat(updates.montoObjetivo);
                if (updates.montoActual !== undefined) updates.montoActual = parseFloat(updates.montoActual);
                goals[idx] = { ...goals[idx], ...updates };
            }
            this._set(this.KEYS.GOALS, goals);
            return;
        }
        const dbUpdates = {};
        if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre;
        if (updates.montoObjetivo !== undefined) dbUpdates.monto_objetivo = parseFloat(updates.montoObjetivo);
        if (updates.montoActual !== undefined) dbUpdates.monto_actual = parseFloat(updates.montoActual);
        if (updates.fechaObjetivo !== undefined) dbUpdates.fecha_objetivo = updates.fechaObjetivo;
        const { error } = await supabase
            .from('goals')
            .update(dbUpdates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteGoal(id) {
        if (this.useLocalStorage) {
            const goals = this._get(this.KEYS.GOALS).filter(g => g.id !== id);
            this._set(this.KEYS.GOALS, goals);
            return;
        }
        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async addFundsToGoal(id, amount) {
        if (this.useLocalStorage) {
            const goals = this._get(this.KEYS.GOALS);
            const idx = goals.findIndex(g => g.id === id);
            if (idx !== -1) {
                goals[idx].montoActual = Math.min(
                    (goals[idx].montoActual || 0) + parseFloat(amount),
                    goals[idx].montoObjetivo
                );
            }
            this._set(this.KEYS.GOALS, goals);
            return;
        }
        // Fetch current goal first
        const { data: goal, error: fetchError } = await supabase
            .from('goals')
            .select('monto_actual, monto_objetivo')
            .eq('id', id)
            .single();
        if (fetchError) throw fetchError;
        const newAmount = Math.min(
            parseFloat(goal.monto_actual || 0) + parseFloat(amount),
            parseFloat(goal.monto_objetivo)
        );
        const { error } = await supabase
            .from('goals')
            .update({ monto_actual: newAmount })
            .eq('id', id);
        if (error) throw error;
    },

    // ==========================================
    // BUDGETS
    // ==========================================
    async getBudgets() {
        if (this.useLocalStorage) {
            return this._get(this.KEYS.BUDGETS);
        }
        const { data, error } = await supabase
            .from('budgets')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) { console.error('getBudgets error:', error); return []; }
        return data.map(b => ({
            id: b.id,
            categoriaId: b.categoria_id,
            limite: parseFloat(b.limite),
            createdAt: b.created_at
        }));
    },

    async addBudget(budget) {
        if (this.useLocalStorage) {
            const budgets = this._get(this.KEYS.BUDGETS);
            const newBudget = {
                id: Helpers.uuid(),
                ...budget,
                limite: parseFloat(budget.limite),
                createdAt: new Date().toISOString()
            };
            budgets.push(newBudget);
            this._set(this.KEYS.BUDGETS, budgets);
            return newBudget;
        }
        const { data, error } = await supabase
            .from('budgets')
            .insert({
                user_id: this._getUserId(),
                categoria_id: budget.categoriaId,
                limite: parseFloat(budget.limite)
            })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            categoriaId: data.categoria_id,
            limite: parseFloat(data.limite),
            createdAt: data.created_at
        };
    },

    async updateBudget(id, updates) {
        if (this.useLocalStorage) {
            const budgets = this._get(this.KEYS.BUDGETS);
            const idx = budgets.findIndex(b => b.id === id);
            if (idx !== -1) {
                if (updates.limite) updates.limite = parseFloat(updates.limite);
                budgets[idx] = { ...budgets[idx], ...updates };
            }
            this._set(this.KEYS.BUDGETS, budgets);
            return;
        }
        const dbUpdates = {};
        if (updates.categoriaId !== undefined) dbUpdates.categoria_id = updates.categoriaId;
        if (updates.limite !== undefined) dbUpdates.limite = parseFloat(updates.limite);
        const { error } = await supabase
            .from('budgets')
            .update(dbUpdates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteBudget(id) {
        if (this.useLocalStorage) {
            const budgets = this._get(this.KEYS.BUDGETS).filter(b => b.id !== id);
            this._set(this.KEYS.BUDGETS, budgets);
            return;
        }
        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getBudgetSpent(categoryId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const transactions = await this.getTransactionsByDateRange(startOfMonth, endOfMonth);
        return transactions
            .filter(t => t.tipo === 'gasto' && t.categoriaId === categoryId)
            .reduce((sum, t) => sum + t.monto, 0);
    },

    // ==========================================
    // AGGREGATIONS
    // ==========================================
    async getMonthlyTotals(year, month) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        const transactions = await this.getTransactionsByDateRange(
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0]
        );
        const ingresos = transactions.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
        const gastos = transactions.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
        return { ingresos, gastos, ahorro: ingresos - gastos };
    },

    async getTotalBalance() {
        const transactions = await this.getTransactions();
        return transactions.reduce((bal, t) => {
            return bal + (t.tipo === 'ingreso' ? t.monto : -t.monto);
        }, 0);
    },

    async getExpensesByCategory(startDate, endDate) {
        const transactions = (await this.getTransactionsByDateRange(startDate, endDate))
            .filter(t => t.tipo === 'gasto');
        const byCategory = {};
        transactions.forEach(t => {
            if (!byCategory[t.categoriaId]) byCategory[t.categoriaId] = 0;
            byCategory[t.categoriaId] += t.monto;
        });
        return byCategory;
    },

    async getMonthlyEvolution(count = 6) {
        const result = [];
        const now = new Date();
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const totals = await this.getMonthlyTotals(d.getFullYear(), d.getMonth());
            result.push({
                month: Helpers.getMonthName(d.getMonth()),
                year: d.getFullYear(),
                ...totals
            });
        }
        return result;
    },

    // ==========================================
    // SEED DATA (only for guest/demo mode)
    // ==========================================
    seedIfEmpty() {
        if (localStorage.getItem(this.KEYS.INITIALIZED)) return;

        // Default categories
        const categories = [
            { id: Helpers.uuid(), nombre: 'Alimentación', icono: '🍔', color: '#F2994A', isDefault: true },
            { id: Helpers.uuid(), nombre: 'Transporte', icono: '🚗', color: '#2F80ED', isDefault: true },
            { id: Helpers.uuid(), nombre: 'Vivienda', icono: '🏠', color: '#9B51E0', isDefault: true },
            { id: Helpers.uuid(), nombre: 'Entretenimiento', icono: '🎬', color: '#E84393', isDefault: true },
            { id: Helpers.uuid(), nombre: 'Salud', icono: '💊', color: '#EB5757', isDefault: true },
            { id: Helpers.uuid(), nombre: 'Educación', icono: '📚', color: '#2D7A4F', isDefault: true },
            { id: Helpers.uuid(), nombre: 'Suscripciones', icono: '📱', color: '#F2C94C', isDefault: true },
            { id: Helpers.uuid(), nombre: 'Otros', icono: '📦', color: '#828282', isDefault: true },
        ];
        this._set(this.KEYS.CATEGORIES, categories);

        // Demo transactions (last 3 months)
        const now = new Date();
        const transactions = [];
        const descriptions = {
            'Alimentación': ['Supermercado', 'Restaurante', 'Café', 'Panadería', 'Mercado local'],
            'Transporte': ['Gasolina', 'Uber', 'Bus', 'Mantenimiento auto', 'Estacionamiento'],
            'Vivienda': ['Alquiler', 'Electricidad', 'Agua', 'Internet', 'Gas'],
            'Entretenimiento': ['Netflix', 'Cine', 'Concierto', 'Videojuegos', 'Streaming'],
            'Salud': ['Farmacia', 'Consulta médica', 'Dentista', 'Vitaminas', 'Gimnasio'],
            'Educación': ['Curso online', 'Libros', 'Material escolar', 'Taller', 'Certificación'],
            'Suscripciones': ['Spotify', 'iCloud', 'Software', 'Revista', 'App premium'],
            'Otros': ['Ropa', 'Regalo', 'Reparación', 'Mascota', 'Donación'],
        };
        const metodosPago = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia'];

        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
            categories.forEach(cat => {
                const numTx = Math.floor(Math.random() * 4) + 2;
                for (let i = 0; i < numTx; i++) {
                    const day = Math.floor(Math.random() * 28) + 1;
                    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
                    const descs = descriptions[cat.nombre] || ['Gasto general'];
                    transactions.push({
                        id: Helpers.uuid(),
                        tipo: 'gasto',
                        monto: Math.round((Math.random() * 150 + 10) * 100) / 100,
                        categoriaId: cat.id,
                        fecha: d.toISOString().split('T')[0],
                        descripcion: descs[Math.floor(Math.random() * descs.length)],
                        metodoPago: metodosPago[Math.floor(Math.random() * metodosPago.length)],
                        createdAt: d.toISOString()
                    });
                }
            });

            const incomeDescs = ['Salario', 'Freelance', 'Inversiones', 'Reembolso', 'Venta'];
            for (let i = 0; i < 3; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
                transactions.push({
                    id: Helpers.uuid(),
                    tipo: 'ingreso',
                    monto: Math.round((Math.random() * 2000 + 1500) * 100) / 100,
                    categoriaId: null,
                    fecha: d.toISOString().split('T')[0],
                    descripcion: incomeDescs[Math.floor(Math.random() * incomeDescs.length)],
                    fuente: incomeDescs[Math.floor(Math.random() * incomeDescs.length)],
                    createdAt: d.toISOString()
                });
            }
        }
        this._set(this.KEYS.TRANSACTIONS, transactions);

        const goals = [
            {
                id: Helpers.uuid(),
                nombre: 'Viaje a Europa',
                montoObjetivo: 5000,
                montoActual: 2350,
                fechaObjetivo: new Date(now.getFullYear() + 1, 5, 15).toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            },
            {
                id: Helpers.uuid(),
                nombre: 'Fondo de emergencia',
                montoObjetivo: 3000,
                montoActual: 1800,
                fechaObjetivo: new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            },
            {
                id: Helpers.uuid(),
                nombre: 'Laptop nueva',
                montoObjetivo: 1500,
                montoActual: 600,
                fechaObjetivo: new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            }
        ];
        this._set(this.KEYS.GOALS, goals);

        const budgets = [
            { id: Helpers.uuid(), categoriaId: categories[0].id, limite: 400, createdAt: new Date().toISOString() },
            { id: Helpers.uuid(), categoriaId: categories[1].id, limite: 200, createdAt: new Date().toISOString() },
            { id: Helpers.uuid(), categoriaId: categories[3].id, limite: 150, createdAt: new Date().toISOString() },
            { id: Helpers.uuid(), categoriaId: categories[4].id, limite: 100, createdAt: new Date().toISOString() },
        ];
        this._set(this.KEYS.BUDGETS, budgets);

        localStorage.setItem(this.KEYS.INITIALIZED, 'true');
    }
};
