console.log("JavaScript caricato correttamente!");

// Configuration
const CONFIG = {
    MIN_PASSWORD_LENGTH: 6,
    API_TIMEOUT: 10000,
    DATE_FORMAT: 'it-IT'
};

// State management
const AppState = {
    userId: null,
    userName: null,
    userEmail: null,
    activeSubscription: false,
    reservationDate: null,

    init() {
        this.userId = sessionStorage.getItem('userId');
        this.userName = sessionStorage.getItem('userName');
        this.userEmail = sessionStorage.getItem('userEmail');
        this.activeSubscription = sessionStorage.getItem('activeSubscription') === 'true';
        this.reservationDate = sessionStorage.getItem('reservationDate');
    },

    setUser(userData) {
        this.userId = userData.userId;
        this.userName = userData.userFullName;
        this.userEmail = userData.userEmail;
        
        sessionStorage.setItem('userId', userData.userId);
        sessionStorage.setItem('userName', userData.userFullName);
        sessionStorage.setItem('userEmail', userData.userEmail);
    },

    setSubscription(isActive, expiredDate = null) {
        this.activeSubscription = isActive;
        sessionStorage.setItem('activeSubscription', isActive);
        if (expiredDate) {
            sessionStorage.setItem('subscriptionExpired', expiredDate);
        }
    },

    clear() {
        this.userId = null;
        this.userName = null;
        this.userEmail = null;
        this.activeSubscription = false;
        this.reservationDate = null;
        sessionStorage.clear();
    }
};

// Utility functions
const Utils = {
    today() {
        return new Date().toISOString().split('T')[0];
    },

    formatDate(dateInput) {
        try {
            const date = new Date(dateInput);
            return date.toLocaleDateString(CONFIG.DATE_FORMAT, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Errore formattazione data:', error);
            return dateInput;
        }
    },

    validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    },

    validatePassword(password) {
        return password && password.length >= CONFIG.MIN_PASSWORD_LENGTH;
    },

    showNotification(message, type = 'info') {
        // Implementa sistema di notifiche più sofisticato
        if (type === 'error') {
            alert(`❌ ${message}`);
        } else if (type === 'success') {
            alert(`✅ ${message}`);
        } else {
            alert(`ℹ️ ${message}`);
        }
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// API service
const ApiService = {
    async makeRequest(endpoint, data = null, method = 'POST') {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
            options.signal = controller.signal;

            const response = await fetch(endpoint, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Richiesta scaduta. Controlla la connessione.');
            }
            console.error(`Errore API ${endpoint}:`, error);
            throw error;
        }
    },

    async login(email, password) {
        return this.makeRequest('/login', { email, password });
    },

    async register(userData) {
        return this.makeRequest('/register', userData);
    },

    async retrieveCourse(userId, reservationDate) {
        return this.makeRequest('/retrieveCourse', { 
            userId, 
            reservation_date: reservationDate 
        });
    },

    async confirmReservation(userId, courseId, reservationDate) {
        return this.makeRequest('/confirmedReservation', { 
            userId, 
            courseId, 
            reservationDate 
        });
    },

    async deleteReservation(reservationId, userId) {
        return this.makeRequest('/deleteReservation', { 
            reservationId, 
            userId 
        });
    },

    async retrieveReservation(userId) {
        return this.makeRequest('/retrieveReservation', { userId });
    },

    async retrieveSubscription(userId) {
        return this.makeRequest('/retrieveSubscription', { userId });
    },

    async buySubscription(userId, subscription) {
        return this.makeRequest('/buySubscription', { userId, subscription });
    }
};

// UI Controller
const UIController = {
    elements: {
        navMenu: null,
        dataInput: null,
        availableSeatsTable: null,
        prenotazioniTable: null
    },

    init() {
        this.elements.navMenu = document.getElementById('navMenu');
        this.elements.dataInput = document.getElementById('dataInput');
        this.elements.availableSeatsTable = document.querySelector('#availableSeatsTable tbody');
        this.elements.prenotazioniTable = document.querySelector('#prenotazioniTable tbody');
    },

    showForm(formId) {
        // Aggiorna stato UI basato su login
        if (!AppState.userId) {
            this.showNoLoginState();
        } else {
            this.showLoggedInState();
        }

        // Nascondi tutti i form
        document.querySelectorAll('.form-container').forEach(form => {
            form.style.display = 'none';
        });

        // Mostra il form selezionato
        const selectedForm = document.getElementById(formId);
        if (selectedForm) {
            selectedForm.style.display = 'block';
        }

        // Chiudi menu hamburger
        if (this.elements.navMenu) {
            this.elements.navMenu.classList.remove('active');
        }
    },

    toggleMenu() {
        if (this.elements.navMenu) {
            this.elements.navMenu.classList.toggle('active');
        }
    },

    showLoggedInState() {
        const elements = {
            welcomeMessageHost: document.getElementById('welcomeMessageHost'),
            loginLink: document.getElementById('loginLink'),
            logoutLink: document.getElementById('logoutLink'),
            logoPlaceholder: document.getElementById('logoPlaceholder')
        };

        if (elements.welcomeMessageHost) elements.welcomeMessageHost.style.display = 'none';
        if (elements.loginLink) elements.loginLink.style.display = 'none';
        if (elements.logoutLink) elements.logoutLink.style.display = 'block';

        // Aggiorna placeholder nome utente
        document.querySelectorAll("#userNamePlaceholder, #userNamePlaceholder2").forEach(el => {
            el.textContent = AppState.userName || '';
        });

        if (elements.logoPlaceholder && AppState.userName) {
            elements.logoPlaceholder.textContent = '- ' + AppState.userName.split(" ")[0];
        }
    },

    showNoLoginState() {
        const elements = {
            welcomeMessageHost: document.getElementById('welcomeMessageHost'),
            loginLink: document.getElementById('loginLink'),
            logoutLink: document.getElementById('logoutLink'),
            logoPlaceholder: document.getElementById('logoPlaceholder'),
            welcomeNoSub: document.getElementById('welcomeNoSub'),
            welcomeSub: document.getElementById('welcomeSub')
        };

        if (elements.welcomeMessageHost) elements.welcomeMessageHost.style.display = 'block';
        if (elements.loginLink) elements.loginLink.style.display = 'block';
        if (elements.logoutLink) elements.logoutLink.style.display = 'none';
        if (elements.logoPlaceholder) elements.logoPlaceholder.textContent = '';
        if (elements.welcomeNoSub) elements.welcomeNoSub.style.display = 'none';
        if (elements.welcomeSub) elements.welcomeSub
