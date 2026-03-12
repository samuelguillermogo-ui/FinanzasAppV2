/* =============================================
   APP.JS - Main Application Controller
   SPA Router + Event Binding
   ============================================= */

const App = {
    currentPage: 'dashboard',
    navVersion: 0,
    initialized: false,
    filterState: {
        period: 'month',
        customStart: null,
        customEnd: null,
        search: ''
    },

    pages: {
        dashboard: { title: 'Dashboard', module: () => DashboardPage },
        transactions: { title: 'Transacciones', module: () => TransactionsPage },
        categories: { title: 'Categorías', module: () => CategoriesPage },
        goals: { title: 'Metas de Ahorro', module: () => GoalsPage },
        budgets: { title: 'Presupuestos', module: () => BudgetsPage },
        reports: { title: 'Reportes', module: () => ReportsPage },
        auth: { title: 'Acceso a la cuenta', module: () => AuthPage }
    },

    async init() {
        // Initialize theme
        const savedTheme = localStorage.getItem('finanzapp_theme') || 'light';
        this.setTheme(savedTheme);

        // Bind global events
        this.bindEvents();

        // Check authentication state
        const session = await AuthService.getSession();
        
        let hash = window.location.hash.slice(1) || 'dashboard';

        if (session) {
            // User is authenticated
            DataService.setAuthMode(false); // Using Supabase
            // Seed demo data if they just registered and their tables are empty
            await DataService.seedIfEmpty();
        } else {
            // Not authenticated in Supabase. Check if they chose guest mode.
            const isGuest = localStorage.getItem('finanzapp_guest_mode') === 'true';
            
            if (isGuest) {
                // Entering as guest
                DataService.setAuthMode(true); // Using localStorage
                await DataService.seedIfEmpty();
            } else {
                // Must authenticate
                hash = 'auth';
            }
        }

        // Navigate to initial page
        await this.navigate(hash);
        this.initialized = true;
    },

    isNavigating: false,
    async navigate(page) {
        if (this.isNavigating) return;
        this.isNavigating = true;
        const currentNavVersion = ++this.navVersion;

        // Immediately close mobile sidebar and overlay to improve responsiveness
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('active');

        try {
            if (!this.pages[page]) page = 'dashboard';
            
            // Auth check before entering a protected page
            let session = null;
            const isGuest = localStorage.getItem('finanzapp_guest_mode') === 'true';
            
            if (page !== 'auth') {
                session = await AuthService.getSession();
                if (!session && !isGuest) {
                    page = 'auth';
                }
            }

            // Version check: if another navigation started, abort this one
            if (currentNavVersion !== this.navVersion) {
                console.log(`Navigation to ${page} aborted: newer navigation in progress.`);
                return;
            }

        this.currentPage = page;

        // Destroy existing charts
        ChartService.destroyAll();

        // Update URL
        window.location.hash = page;

        // Manage sidebar visibility depending on auth page
        const sidebar = document.getElementById('sidebar');
        const header = document.querySelector('.topbar');
        
        if (page === 'auth') {
            if (sidebar) sidebar.style.display = 'none';
            if (header) header.style.display = 'none';
            document.documentElement.style.setProperty('--sidebar-width', '0px');
            document.body.classList.add('auth-view');
        } else {
            if (sidebar) {
                sidebar.style.display = 'flex';
                sidebar.style.visibility = 'visible';
            }
            if (header) {
                header.style.display = 'flex';
                header.style.visibility = 'visible';
            }
            document.documentElement.style.setProperty('--sidebar-width', '250px');
            document.body.classList.remove('auth-view');
            
            // Update nav active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.page === page);
            });
            
            // Render user status on topbar
            await this.renderUserStatus();
        }

        // Version check again before rendering heavy modules
        if (currentNavVersion !== this.navVersion) return;

        // Update page title
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = this.pages[page].title;

            // Render page
            const pageModule = this.pages[page].module();
            await pageModule.render();

            // Scroll to top
            document.getElementById('content-area')?.scrollTo(0, 0);
        } finally {
            this.isNavigating = false;
        }
    },

    getFilterRange() {
        const s = this.filterState;
        const now = new Date();
        let start = '';
        let end = new Date().toISOString().split('T')[0];

        if (s.period === 'week') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = d.toISOString().split('T')[0];
        } else if (s.period === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (s.period === 'year') {
            start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        } else if (s.period === 'custom' && s.customStart && s.customEnd) {
            start = s.customStart;
            end = s.customEnd;
        } else {
            // Default to month if custom not set
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        }

        return { start, end };
    },

    async renderUserStatus() {
        const userInfoEl = document.getElementById('user-info-display');
        if (!userInfoEl) return;
        
        const isGuest = DataService.useLocalStorage;
        let displayName = '';
        let displayEmail = '';
        let letter = '';
        let avatarBg = '';
        let avatarColor = '';

        if (isGuest) {
            displayName = 'Modo Invitado';
            displayEmail = 'Cuentas locales';
            letter = '👻';
            avatarBg = 'var(--border-color)';
            avatarColor = 'var(--text-secondary)';
        } else {
            const session = await AuthService.getSession();
            displayEmail = session?.user?.email || 'Usuario';
            displayName = displayEmail.split('@')[0];
            letter = displayEmail.charAt(0).toUpperCase();
            avatarBg = 'var(--primary)';
            avatarColor = 'white';
        }

        userInfoEl.innerHTML = `
            <div class="user-profile-container" id="profile-menu-trigger">
                <div class="user-info-text">
                    <strong style="display:block;font-size:14px;color:var(--text-primary)">${displayName}</strong>
                    <span style="font-size:12px;color:var(--text-tertiary)">${isGuest ? 'Invitado' : 'Conectado'}</span>
                </div>
                <div class="user-avatar" style="background:${avatarBg}; color:${avatarColor}">
                    ${letter}
                </div>
                
                <div class="profile-dropdown" id="profile-dropdown">
                    <div class="dropdown-header">
                        <strong style="display:block;font-size:14px;">${displayName}</strong>
                        <span class="dropdown-email">${displayEmail}</span>
                    </div>
                    <button class="dropdown-item" onclick="App.navigate('dashboard')">
                        <span>🏠</span> Inicio
                    </button>
                    <button class="dropdown-item logout" onclick="App.logout()">
                        <span>🚪</span> Cerrar Sesión
                    </button>
                </div>
            </div>
        `;

        // Bind toggle event directly after rendering
        document.getElementById('profile-menu-trigger')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleProfileMenu();
        });
    },

    toggleProfileMenu() {
        const dropdown = document.getElementById('profile-dropdown');
        dropdown?.classList.toggle('active');
    },

    async logout() {
        if (!DataService.useLocalStorage) {
            await AuthService.signOut();
        } else {
            localStorage.removeItem('finanzapp_guest_mode');
        }
        this.navigate('auth');
    },

    bindEvents() {
        // Navigation clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(item.dataset.page);
            });
        });

        // Hash change
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && hash !== this.currentPage) {
                this.navigate(hash);
            }
        });

        // Mobile menu toggle
        document.getElementById('menu-toggle')?.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            sidebar?.classList.toggle('open');
            overlay?.classList.toggle('active');
        });

        // Close sidebar on overlay click (mobile)
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.remove('open');
            document.getElementById('sidebar-overlay')?.classList.remove('active');
        });

        // Modal close
        document.getElementById('modal-close')?.addEventListener('click', Helpers.closeModal);
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) Helpers.closeModal();
        });

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') Helpers.closeModal();
        });

        // Theme toggle
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown?.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        });

        // Period filter buttons (re-render current page)
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                
                if (period === 'custom') {
                    this.openCustomDateModal();
                    return;
                }

                this.filterState.period = period;
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.navigate(this.currentPage);
            });
        });

        // Global Search
        document.getElementById('search-input')?.addEventListener('input', Helpers.debounce((e) => {
            this.filterState.search = e.target.value;
            this.navigate(this.currentPage);
        }, 300));
    },

    openCustomDateModal() {
        const html = `
            <div class="form-group">
                <label class="form-label">Fecha Inicio</label>
                <input type="date" class="form-input" id="custom-start-date" value="${this.filterState.customStart || Helpers.today()}">
            </div>
            <div class="form-group" style="margin-top: var(--space-4)">
                <label class="form-label">Fecha Fin</label>
                <input type="date" class="form-input" id="custom-end-date" value="${this.filterState.customEnd || Helpers.today()}">
            </div>
            <div style="margin-top: var(--space-6); display: flex; gap: var(--space-3); justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="Helpers.closeModal()">Cancelar</button>
                <button class="btn btn-primary" id="btn-apply-custom-dates">Aplicar Filtro</button>
            </div>
        `;
        Helpers.openModal('Filtrar por Fecha', html);

        document.getElementById('btn-apply-custom-dates')?.addEventListener('click', () => {
            const start = document.getElementById('custom-start-date').value;
            const end = document.getElementById('custom-end-date').value;
            
            if (!start || !end) {
                Helpers.showToast('Por favor selecciona ambas fechas', 'warning');
                return;
            }

            this.filterState.period = 'custom';
            this.filterState.customStart = start;
            this.filterState.customEnd = end;

            // Update UI
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-period-custom')?.classList.add('active');
            
            Helpers.closeModal();
            this.navigate(this.currentPage);
        });
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('finanzapp_theme', theme);
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });

        // Re-render charts ONLY if fully initialized and on a page that has them
        if (this.initialized && ['dashboard', 'reports'].includes(this.currentPage)) {
            ChartService.destroyAll();
            const pageModule = this.pages[this.currentPage].module();
            pageModule.render();
        }
    },

    async handleAuthReady() {
        // Force session refresh and setup correct DataService mode
        console.log('Auth ready triggered, synchronizing state...');
        const session = await AuthService.getSession();
        const isGuest = localStorage.getItem('finanzapp_guest_mode') === 'true';
        
        if (session) {
            console.log('Authenticated session found.');
            DataService.setAuthMode(false);
            await DataService.seedIfEmpty();
        } else if (isGuest) {
            console.log('Guest mode active.');
            DataService.setAuthMode(true);
            await DataService.seedIfEmpty();
        } else {
            console.log('No session or guest mode, redirecting to auth.');
            return this.navigate('auth');
        }

        await this.navigate('dashboard');
    }
};

// Make it global for pages to access
window.App = App;

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
