/* =============================================
   APP.JS - Main Application Controller
   SPA Router + Event Binding
   ============================================= */

const App = {
    currentPage: 'dashboard',

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
    },

    async navigate(page) {
        if (!this.pages[page]) page = 'dashboard';
        
        // Auth check before entering a protected page
        if (page !== 'auth') {
            const isGuest = localStorage.getItem('finanzapp_guest_mode') === 'true';
            const session = await AuthService.getSession();
            if (!session && !isGuest) {
                page = 'auth';
            }
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
        } else {
            if (sidebar) sidebar.style.display = 'flex';
            if (header) header.style.display = 'flex';
            document.documentElement.style.setProperty('--sidebar-width', '250px');
            
            // Update nav active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.page === page);
            });
            
            // Render user status on topbar
            await this.renderUserStatus();
        }

        // Update page title
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = this.pages[page].title;

        // Render page
        const pageModule = this.pages[page].module();
        await pageModule.render();

        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');

        // Scroll to top
        document.getElementById('content-area')?.scrollTo(0, 0);
    },

    async renderUserStatus() {
        const userInfoEl = document.getElementById('user-info-display');
        if (!userInfoEl) return;
        
        const isGuest = DataService.useLocalStorage;
        
        if (isGuest) {
            userInfoEl.innerHTML = `
                <div style="text-align:right;">
                    <strong style="display:block;font-size:14px;color:var(--text-primary)">Modo Invitado</strong>
                    <span style="font-size:12px;color:var(--text-tertiary)">Cuentas locales</span>
                </div>
                <div class="user-avatar" style="background:var(--border-color); color:var(--text-secondary)">
                    👻
                </div>
                <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="Salir del modo invitado">→</button>
            `;
        } else {
            const session = await AuthService.getSession();
            const email = session?.user?.email || 'Usuario';
            const letter = email.charAt(0).toUpperCase();

            userInfoEl.innerHTML = `
                <div style="text-align:right;">
                    <strong style="display:block;font-size:14px;color:var(--text-primary)">${email}</strong>
                    <span style="font-size:12px;color:var(--success)">Conectado</span>
                </div>
                <div class="user-avatar" style="background:var(--primary); color:white">
                    ${letter}
                </div>
                <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="Cerrar Sessión">→</button>
            `;
        }
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
            document.getElementById('sidebar')?.classList.toggle('open');
        });

        // Close sidebar on overlay click (mobile)
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.getElementById('menu-toggle');
            if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && !toggle?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
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

        // Period filter buttons (re-render current page)
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Re-render current page with new period
                this.navigate(this.currentPage);
            });
        });
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('finanzapp_theme', theme);
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });

        // Re-render charts if on a page that has them
        if (['dashboard', 'reports'].includes(this.currentPage)) {
            ChartService.destroyAll();
            const pageModule = this.pages[this.currentPage].module();
            pageModule.render();
        }
    },

    handleAuthReady() {
        this.navigate('dashboard');
    }
};

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
