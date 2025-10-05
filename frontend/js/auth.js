class AuthManager {
    constructor() {
        this.apiBaseUrl = '/api';
        this.tokenKey = 'access_token';
        this.init();
    }

    init() {
        if (window.location.pathname.includes('/auth/login')) {
            this.initLoginForm();
        } else if (window.location.pathname.includes('/auth/register')) {
            this.initRegisterForm();
        }
    }

    initLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleLogin();
        });
    }

    initRegisterForm() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleRegister();
        });
    }

    async handleLogin() {
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login fehlgeschlagen');
            }

            const data = await response.json();
            this.setToken(data.access_token);
            window.location.href = '/';
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleRegister() {
        const email = document.getElementById('email')?.value;
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (password !== confirmPassword) {
            this.showError('Passwörter stimmen nicht überein');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registrierung fehlgeschlagen');
            }

            await this.handleLogin();
        } catch (error) {
            this.showError(error.message);
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) return;

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    removeToken() {
        localStorage.removeItem(this.tokenKey);
    }

    isAuthenticated() {
        return Boolean(this.getToken());
    }

    logout() {
        this.removeToken();
        window.location.href = '/auth/login.html';
    }

    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            return Promise.reject(new Error('Nicht authentifiziert'));
        }

        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        };

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            this.logout();
            return Promise.reject(new Error('Sitzung abgelaufen'));
        }

        return response;
    }
}

const authManager = new AuthManager();
window.authManager = authManager;
