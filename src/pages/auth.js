/* =============================================
   AUTH PAGE - Login / Register
   ============================================= */

const AuthPage = {
    isLogin: true,

    render() {
        const content = document.getElementById('content-area');
        content.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-logo">
                            <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
                                <rect width="28" height="28" rx="8" fill="var(--primary)"/>
                                <path d="M8 14L12 10L16 14L20 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8 20H20" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <h2 class="auth-title">FinanzApp</h2>
                        <p class="auth-subtitle">${this.isLogin ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta gratis'}</p>
                    </div>

                    <div class="auth-tabs">
                        <button class="auth-tab ${this.isLogin ? 'active' : ''}" id="tab-login">Iniciar Sesión</button>
                        <button class="auth-tab ${!this.isLogin ? 'active' : ''}" id="tab-register">Registrarse</button>
                    </div>

                    <form class="auth-form" id="auth-form">
                        ${!this.isLogin ? `
                            <div class="form-group">
                                <label class="form-label" for="auth-name">Nombre completo</label>
                                <input type="text" id="auth-name" class="form-input" placeholder="Tu nombre" required>
                            </div>
                        ` : ''}
                        <div class="form-group">
                            <label class="form-label" for="auth-email">Correo electrónico</label>
                            <input type="email" id="auth-email" class="form-input" placeholder="correo@ejemplo.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="auth-password">Contraseña</label>
                            <input type="password" id="auth-password" class="form-input" placeholder="Mínimo 6 caracteres" minlength="6" required>
                        </div>
                        ${!this.isLogin ? `
                            <div class="form-group">
                                <label class="form-label" for="auth-password-confirm">Confirmar contraseña</label>
                                <input type="password" id="auth-password-confirm" class="form-input" placeholder="Repite tu contraseña" minlength="6" required>
                            </div>
                        ` : ''}
                        <div id="auth-error" class="auth-error" style="display:none;"></div>
                        <button type="submit" class="btn btn-primary btn-block" id="auth-submit">
                            <span id="auth-submit-text">${this.isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                            <span id="auth-submit-loading" style="display:none;">
                                <span class="spinner"></span> Cargando...
                            </span>
                        </button>
                    </form>

                    ${this.isLogin ? `
                        <div class="auth-footer">
                            <a href="#" id="forgot-password" class="auth-link">¿Olvidaste tu contraseña?</a>
                        </div>
                    ` : ''}

                    <div class="auth-divider">
                        <span>o</span>
                    </div>

                    <button class="btn btn-outline btn-block" id="auth-guest">
                        🧪 Modo Demo (sin cuenta)
                    </button>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        // Tab switching
        document.getElementById('tab-login')?.addEventListener('click', () => {
            this.isLogin = true;
            this.render();
        });

        document.getElementById('tab-register')?.addEventListener('click', () => {
            this.isLogin = false;
            this.render();
        });

        // Form submit
        document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });

        // Guest mode
        document.getElementById('auth-guest')?.addEventListener('click', () => {
            this.enterGuestMode();
        });

        // Forgot password
        document.getElementById('forgot-password')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword();
        });
    },

    showError(message) {
        const errorEl = document.getElementById('auth-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    },

    setLoading(loading) {
        const textEl = document.getElementById('auth-submit-text');
        const loadingEl = document.getElementById('auth-submit-loading');
        const submitBtn = document.getElementById('auth-submit');
        if (textEl) textEl.style.display = loading ? 'none' : 'inline';
        if (loadingEl) loadingEl.style.display = loading ? 'inline-flex' : 'none';
        if (submitBtn) submitBtn.disabled = loading;
    },

    async handleSubmit() {
        const email = document.getElementById('auth-email')?.value.trim();
        const password = document.getElementById('auth-password')?.value;
        
        if (!email || !password) {
            this.showError('Por favor completa todos los campos.');
            return;
        }

        this.setLoading(true);

        try {
            if (this.isLogin) {
                await AuthService.signIn(email, password);
                Helpers.showToast('¡Bienvenido de vuelta!', 'success');
            } else {
                const name = document.getElementById('auth-name')?.value.trim();
                const confirmPassword = document.getElementById('auth-password-confirm')?.value;

                if (password !== confirmPassword) {
                    this.showError('Las contraseñas no coinciden.');
                    this.setLoading(false);
                    return;
                }

                await AuthService.signUp(email, password, name);
                Helpers.showToast('¡Cuenta creada! Revisa tu email para verificar.', 'success');
            }

            // Auth state change will trigger navigation
            App.handleAuthReady();
        } catch (error) {
            const messages = {
                'Invalid login credentials': 'Email o contraseña incorrectos.',
                'User already registered': 'Este email ya está registrado.',
                'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
                'Unable to validate email address: invalid format': 'Por favor ingresa un email válido.',
            };
            this.showError(messages[error.message] || error.message || 'Error de autenticación.');
        } finally {
            this.setLoading(false);
        }
    },

    async handleForgotPassword() {
        const email = document.getElementById('auth-email')?.value.trim();
        if (!email) {
            this.showError('Ingresa tu email primero.');
            return;
        }
        try {
            await AuthService.resetPassword(email);
            Helpers.showToast('Se envió un enlace de recuperación a tu email.', 'success');
        } catch (error) {
            this.showError(error.message || 'Error al enviar el enlace.');
        }
    },

    enterGuestMode() {
        // Set guest mode flag and use localStorage DataService
        window.FINANZAPP_GUEST_MODE = true;
        DataService.useLocalStorage = true;
        DataService.seedIfEmpty();
        Helpers.showToast('Modo demo activado. Tus datos se guardan localmente.', 'success');
        App.handleAuthReady();
    }
};
