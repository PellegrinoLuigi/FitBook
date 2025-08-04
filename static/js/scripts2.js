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
        if (elements.welcomeSub) elements.welcomeSub.style.display = 'none';

        // Pulisci placeholder nome utente
        document.querySelectorAll("#userNamePlaceholder, #userNamePlaceholder2").forEach(el => {
            el.textContent = '';
        });
    },

    showActiveSubscription(expiredDate) {
        const elements = {
            subExpiredDate: document.getElementById('subExpiredDate'),
            welcomeSub: document.getElementById('welcomeSub'),
            welcomeNoSub: document.getElementById('welcomeNoSub')
        };

        if (elements.subExpiredDate) {
            elements.subExpiredDate.textContent = Utils.formatDate(expiredDate);
        }
        if (elements.welcomeSub) elements.welcomeSub.style.display = 'block';
        if (elements.welcomeNoSub) elements.welcomeNoSub.style.display = 'none';
        
        AppState.setSubscription(true, expiredDate);
    },

    showNoActiveSubscription() {
        const elements = {
            welcomeNoSub: document.getElementById('welcomeNoSub'),
            welcomeSub: document.getElementById('welcomeSub')
        };

        if (elements.welcomeNoSub) elements.welcomeNoSub.style.display = 'block';
        if (elements.welcomeSub) elements.welcomeSub.style.display = 'none';
        
        AppState.setSubscription(false);
    },

    renderCourseTable(courses) {
        if (!this.elements.availableSeatsTable) return;

        const tbody = this.elements.availableSeatsTable;
        tbody.innerHTML = '';

        if (!courses || courses.length === 0) {
            this.showNoCourses();
            return;
        }

        const courseRows = courses.map(course => {
            const [id, name, availableSeats, weekday, startTime, duration, trainerFirst, trainerLast] = course;
            const isDisabled = availableSeats < 1 || !AppState.activeSubscription;
            
            return `
                <tr>
                    <td>${name}</td>
                    <td>${availableSeats} posti</td>
                    <td>${startTime}</td>
                    <td>${duration} min.</td>
                    <td>${trainerFirst} ${trainerLast}</td>
                    <td>
                        <button 
                            title="${!AppState.activeSubscription ? 'Verifica se il tuo abbonamento è attivo' : ''}"
                            class="custom-button ${isDisabled ? 'disabled' : ''}" 
                            onclick="CourseService.confirmReservation('${id}')"
                            ${isDisabled ? 'disabled' : ''}
                        >
                            Prenota
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = courseRows;
        this.showCourses();
    },

    renderReservationTable(reservations) {
        if (!this.elements.prenotazioniTable) return;

        const tbody = this.elements.prenotazioniTable;
        tbody.innerHTML = '';

        if (!reservations || reservations.length === 0) {
            this.showNoReservations();
            return;
        }

        const reservationRows = reservations.map(reservation => {
            const [id, name, date, startTime] = reservation;
            
            return `
                <tr>
                    <td>${name}</td>                                
                    <td>${Utils.formatDate(date)} h: ${startTime}</td>
                    <td>
                        <button 
                            class="custom-button" 
                            onclick="ReservationService.deleteReservation('${id}')"
                        >
                            Cancella
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = reservationRows;
        this.showReservations();
    },

    showCourses() {
        const elements = {
            noCourse: document.getElementById('noCourse'),
            availableSeats: document.getElementById('availableSeats')
        };

        if (elements.noCourse) elements.noCourse.style.display = 'none';
        if (elements.availableSeats) elements.availableSeats.style.display = 'block';
    },

    showNoCourses() {
        const elements = {
            noCourse: document.getElementById('noCourse'),
            availableSeats: document.getElementById('availableSeats')
        };

        if (elements.noCourse) elements.noCourse.style.display = 'block';
        if (elements.availableSeats) elements.availableSeats.style.display = 'none';
    },

    showReservations() {
        const elements = {
            prenotazioniTable: document.getElementById('prenotazioniTable'),
            noReservation: document.getElementById('noReservation')
        };

        if (elements.prenotazioniTable) elements.prenotazioniTable.style.display = 'table';
        if (elements.noReservation) elements.noReservation.style.display = 'none';
    },

    showNoReservations() {
        const elements = {
            prenotazioniTable: document.getElementById('prenotazioniTable'),
            noReservation: document.getElementById('noReservation')
        };

        if (elements.prenotazioniTable) elements.prenotazioniTable.style.display = 'none';
        if (elements.noReservation) elements.noReservation.style.display = 'block';
    },

    setLoading(elementId, isLoading) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (isLoading) {
            element.style.opacity = '0.6';
            element.style.pointerEvents = 'none';
        } else {
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
        }
    }
};

// Authentication Service
const AuthService = {
    async login(email, password) {
        // Validazione input
        if (!email || !password) {
            throw new Error('Email e password sono obbligatori');
        }

        if (!Utils.validateEmail(email)) {
            throw new Error('Email non valida');
        }

        try {
            const response = await ApiService.login(email, password);
            
            if (response.success) {
                AppState.setUser(response);
                UIController.showForm('home');
                await this.loadUserSubscription();
                Utils.showNotification('Login effettuato con successo!', 'success');
            } else {
                throw new Error(response.message || 'Credenziali non valide');
            }
        } catch (error) {
            Utils.showNotification(error.message, 'error');
            throw error;
        }
    },

    async register(userData) {
        // Validazione input
        const requiredFields = ['first_name', 'last_name', 'email', 'birthdate', 'password'];
        const missingFields = requiredFields.filter(field => !userData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Campi obbligatori: ${missingFields.join(', ')}`);
        }

        if (!Utils.validateEmail(userData.email)) {
            throw new Error('Email non valida');
        }

        if (!Utils.validatePassword(userData.password)) {
            throw new Error(`Password deve essere di almeno ${CONFIG.MIN_PASSWORD_LENGTH} caratteri`);
        }

        try {
            const response = await ApiService.register(userData);
            
            if (response.success) {
                Utils.showNotification('Registrazione completata! Effettua il login.', 'success');
                UIController.showForm('login');
            } else {
                throw new Error(response.message || 'Errore durante la registrazione');
            }
        } catch (error) {
            Utils.showNotification(error.message, 'error');
            throw error;
        }
    },

    async loadUserSubscription() {
        if (!AppState.userId) return;

        try {
            const response = await ApiService.retrieveSubscription(AppState.userId);
            
            if (response.success && response.subscriptionList.length > 0) {
                const subscription = response.subscriptionList[0];
                const endDate = subscription[3]; // end_date è al index 3
                const expiredDateFormat = new Date(endDate);
                
                if (expiredDateFormat.toISOString().split('T')[0] >= Utils.today()) {
                    UIController.showActiveSubscription(endDate);
                } else {
                    UIController.showNoActiveSubscription();
                }
            } else {
                UIController.showNoActiveSubscription();
            }
        } catch (error) {
            console.error('Errore caricamento abbonamento:', error);
            UIController.showNoActiveSubscription();
        }
    },

    logout() {
        AppState.clear();
        UIController.showNoLoginState();
        UIController.showForm('home');
        Utils.showNotification('Logout effettuato', 'success');
    }
};

// Course Service
const CourseService = {
    async retrieveCourses(reservationDate) {
        if (!AppState.userId) {
            Utils.showNotification('Devi effettuare il login', 'error');
            UIController.showForm('login');
            return;
        }

        if (!reservationDate) {
            Utils.showNotification('Seleziona una data', 'error');
            return;
        }

        try {
            UIController.setLoading('reservation', true);

            AppState.reservationDate = reservationDate;
            sessionStorage.setItem('reservationDate', reservationDate);

            const response = await ApiService.retrieveCourse(AppState.userId, reservationDate);
            
            if (response.success) {
                const selectedDateEl = document.getElementById('selectedDate');
                if (selectedDateEl) {
                    selectedDateEl.textContent = Utils.formatDate(reservationDate);
                }
                
                UIController.renderCourseTable(response.courselist);
            } else {
                UIController.showNoCourses();
                Utils.showNotification(response.message || 'Nessun corso disponibile', 'info');
            }
        } catch (error) {
            console.error('Errore recupero corsi:', error);
            UIController.showNoCourses();
            Utils.showNotification('Errore nel caricamento dei corsi', 'error');
        } finally {
            UIController.setLoading('reservation', false);
        }
    },

    async confirmReservation(courseId) {
        if (!AppState.activeSubscription) {
            UIController.showForm('buySubscription');
            return;
        }

        if (!AppState.userId || !courseId || !AppState.reservationDate) {
            Utils.showNotification('Dati mancanti per la prenotazione', 'error');
            return;
        }

        try {
            const response = await ApiService.confirmReservation(
                AppState.userId, 
                courseId, 
                AppState.reservationDate
            );
            
            if (response.success) {
                Utils.showNotification('Prenotazione confermata!', 'success');
                await this.retrieveCourses(AppState.reservationDate); // Refresh della lista
            } else {
                Utils.showNotification(response.message || 'Errore prenotazione', 'error');
            }
        } catch (error) {
            console.error('Errore conferma prenotazione:', error);
            Utils.showNotification('Errore durante la prenotazione', 'error');
        }
    }
};

// Reservation Service
const ReservationService = {
    async retrieveReservations() {
        if (!AppState.userId) {
            Utils.showNotification('Devi effettuare il login', 'error');
            UIController.showForm('login');
            return;
        }

        try {
            UIController.setLoading('showReservation', true);

            const response = await ApiService.retrieveReservation(AppState.userId);
            
            if (response.success) {
                UIController.renderReservationTable(response.reservationlist);
            } else {
                UIController.showNoReservations();
                Utils.showNotification(response.message || 'Nessuna prenotazione trovata', 'info');
            }
        } catch (error) {
            console.error('Errore recupero prenotazioni:', error);
            UIController.showNoReservations();
            Utils.showNotification('Errore nel caricamento delle prenotazioni', 'error');
        } finally {
            UIController.setLoading('showReservation', false);
        }
    },

    async deleteReservation(reservationId) {
        if (!AppState.userId || !reservationId) {
            Utils.showNotification('Dati mancanti', 'error');
            return;
        }

        if (!confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
            return;
        }

        try {
            const response = await ApiService.deleteReservation(reservationId, AppState.userId);
            
            if (response.success) {
                Utils.showNotification('Prenotazione cancellata', 'success');
                await this.retrieveReservations(); // Refresh della lista
            } else {
                Utils.showNotification(response.message || 'Errore cancellazione', 'error');
            }
        } catch (error) {
            console.error('Errore cancellazione prenotazione:', error);
            Utils.showNotification('Errore durante la cancellazione', 'error');
        }
    }
};

// Subscription Service
const SubscriptionService = {
    async buySubscription(subscriptionDays) {
        if (!AppState.userId) {
            Utils.showNotification('Devi effettuare il login', 'error');
            UIController.showForm('login');
            return;
        }

        if (!subscriptionDays || subscriptionDays <= 0) {
            Utils.showNotification('Seleziona una durata valida', 'error');
            return;
        }

        try {
            UIController.setLoading('buySubscription', true);

            const response = await ApiService.buySubscription(AppState.userId, subscriptionDays);
            
            if (response.success) {
                Utils.showNotification('Abbonamento acquistato!', 'success');
                UIController.showForm('activeSubscription');
                await AuthService.loadUserSubscription(); // Ricarica stato abbonamento
            } else {
                Utils.showNotification(response.message || 'Errore acquisto', 'error');
            }
        } catch (error) {
            console.error('Errore acquisto abbonamento:', error);
            Utils.showNotification('Errore durante l\'acquisto', 'error');
        } finally {
            UIController.setLoading('buySubscription', false);
        }
    }
};

// Form Event Handlers
const FormHandlers = {
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        
        try {
            await AuthService.login(email, password);
        } catch (error) {
            // Errore già gestito in AuthService.login
        }
    },

    async handleRegistration(event) {
        event.preventDefault();
        
        const formData = {
            first_name: document.getElementById('firstname')?.value,
            last_name: document.getElementById('lastname')?.value,
            email: document.getElementById('emailreg')?.value,
            birthdate: document.getElementById('birthdate')?.value,
            password: document.getElementById('passwordReg')?.value
        };
        
        try {
            await AuthService.register(formData);
        } catch (error) {
            // Errore già gestito in AuthService.register
        }
    },

    async handleRetrieveCourse(event) {
        event.preventDefault();
        
        const reservationDate = document.getElementById('dataInput')?.value;
        await CourseService.retrieveCourses(reservationDate);
    },

    async handleBuySubscription(event) {
        event.preventDefault();
        
        const subscriptionDays = document.getElementById('subscription')?.value;
        await SubscriptionService.buySubscription(parseInt(subscriptionDays));
    }
};

// Global functions (called from HTML)
function activeMenu() {
    UIController.toggleMenu();
}

function showForm(formId) {
    UIController.showForm(formId);
}

function checkLogin(formId) {
    if (!AppState.userId) {
        UIController.showForm('login');
        UIController.showNoLoginState();
    } else {
        UIController.showForm(formId);
        UIController.showLoggedInState();
        
        // Carica dati specifici per certe sezioni
        if (formId === 'showReservation') {
            ReservationService.retrieveReservations();
        }
    }
}

function goLogout() {
    AuthService.logout();
}

// Funzioni chiamate direttamente dall'HTML (retrocompatibilità)
function login(event) {
    return FormHandlers.handleLogin(event);
}

function registration(event) {
    return FormHandlers.handleRegistration(event);
}

function retrieveCourse(event) {
    return FormHandlers.handleRetrieveCourse(event);
}

function buySubscription(event) {
    return FormHandlers.handleBuySubscription(event);
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    try {
        // Inizializza componenti
        AppState.init();
        UIController.init();
        
        // Setup initial state
        if (AppState.userId) {
            UIController.showLoggedInState();
            AuthService.loadUserSubscription();
        } else {
            UIController.showNoLoginState();
        }
        
        // Mostra home di default
        UIController.showForm('home');
        
        // Setup date input
        const dataInput = document.getElementById('dataInput');
        if (dataInput) {
            dataInput.setAttribute('min', Utils.today());
            dataInput.value = Utils.today();
        }
        
        console.log('Applicazione inizializzata correttamente');
        
    } catch (error) {
        console.error('Errore inizializzazione:', error);
        Utils.showNotification('Errore nell\'inizializzazione dell\'applicazione', 'error');
    }
});
