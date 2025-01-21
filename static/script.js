// Variabile per memorizzare lo stato di login
let loggedInUser = null;

// Funzione per attivare/disattivare il menu hamburger
function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

// Funzione per mostrare il form selezionato
function showForm(formId) {
    // Nascondi tutti i form
    const forms = document.querySelectorAll('.form-container');
    forms.forEach(form => form.style.display = 'none');

    // Mostra il form selezionato
    const selectedForm = document.getElementById(formId);
    selectedForm.style.display = 'block';

    // Chiudi il menu hamburger (opzionale)
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.remove('active');
}

// Funzione per verificare se l'utente è loggato
function checkLogin(formId) {
    if (!loggedInUser) {
        alert("Devi effettuare il login per accedere a questa funzionalità.");
        showForm('login');
    } else {
        showForm(formId);
        if (formId === 'mostraPrenotazioni') {
            caricaPrenotazioni();
        }
    }
}

// Funzione per effettuare il login
function effettuaLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simulazione di login (in un caso reale, fare una richiesta al server)
    loggedInUser = { email, password };
    alert("Login effettuato con successo!");
    showForm('home');
}

// Funzione per effettuare la registrazione
function effettuaRegistrazione(event) {
    event.preventDefault();
    const nome = document.getElementById('nome').value;
    const cognome = document.getElementById('cognome').value;
    const email = document.getElementById('email').value;
    const dataNascita = document.getElementById('data_nascita').value;
    const password = document.getElementById('password').value;

    // Simulazione di registrazione (in un caso reale, fare una richiesta al server)
    loggedInUser = { nome, cognome, email, dataNascita, password };
    alert("Registrazione effettuata con successo!");
    showForm('login');
}

// Funzione per effettuare una prenotazione
function effettuaPrenotazione(event) {
    event.preventDefault();
    if (!loggedInUser) {
        alert("Devi effettuare il login per prenotare.");
        showForm('login');
        return;
    }

    const nome = document.getElementById('name').value;
    const data = document.getElementById('date').value;

    // Simulazione di prenotazione (in un caso reale, fare una richiesta al server)
    alert(`Prenotazione effettuata per ${nome} il ${data}`);
    showForm('home');
}

// Funzione per caricare le prenotazioni
function caricaPrenotazioni() {
    if (!loggedInUser) {
        alert("Devi effettuare il login per visualizzare le prenotazioni.");
        showForm('login');
        return;
    }

    // Simulazione di prenotazioni (in un caso reale, fare una richiesta al server)
    const prenotazioni = [
        { nome: "Mario Rossi", data: "2023-10-15" },
        { nome: "Luigi Verdi", data: "2023-10-20" }
    ];

    const tbody = document.querySelector('#prenotazioniTable tbody');
    tbody.innerHTML = prenotazioni.map(p => `
        <tr>
            <td>${p.nome}</td>
            <td>${p.data}</td>
        </tr>
    `).join('');
}

// Funzione per effettuare un acquisto
function effettuaAcquisto(event) {
    event.preventDefault();
    if (!loggedInUser) {
        alert("Devi effettuare il login per acquistare.");
        showForm('login');
        return;
    }

    const abbonamento = document.getElementById('abbonamento').value;
    alert(`Abbonamento acquistato per ${abbonamento} mesi.`);
    showForm('home');
}

// Mostra la Home di default al caricamento della pagina
window.onload = () => showForm('home');
