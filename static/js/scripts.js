console.log("JavaScript caricato correttamente! ");


// Variabile per memorizzare lo stato di login
let userId = null;

// Funzione per attivare/disattivare il menu hamburger
function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

// Funzione per mostrare il form selezionato
function showForm(formId) {
    // Nascondi tutti i form
    if (!userId /*|| sessionStorage.getItem('activeSubscription')*/) {
        noActiveLogin();
    } else {
        activeLogin();
    }
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
    if (!userId) {
        //alert("Devi effettuare il login per accedere a questa funzionalità.");
        showForm('login');
        noActiveLogin();
    } else {
        showForm(formId);
        activeLogin();
        if (formId === 'showReservation') {
            retrieveReservation();
        }
    }
}

// Funzione per effettuare il login
function login(event) {
    event.preventDefault();        
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
               
                showForm('home');
                userId=data.userId;
                sessionStorage.setItem('userName', data.userFullName);
                sessionStorage.setItem('userEmail', data.userEmail);
                sessionStorage.setItem('userId', data.userId);
                activeLogin();
                const userData = {
                    userId: userId
                };
                // retrieveSubscription(userData); 
                //document.getElementById('userName').textContent = data.userFullName;
            } else {
                alert(data.message || "Login fallito. Controlla email e password.");
            }
        })
        .catch(error => {
            console.error("Errore durante il login:", error);
            alert("Si è verificato un errore. Riprova più tardi.");
        });
}

function registration(event) {
    event.preventDefault();
    const firstname = document.getElementById('firstname').value;
    const lastname = document.getElementById('lastname').value;
    const email = document.getElementById('emailreg').value;
    const birthDate = document.getElementById('birthdate').value;
    const password = document.getElementById('passwordReg').value;

    const userData = {
        first_name: firstname,
        last_name: lastname,
        email: email,
        birthdate: birthDate,
        password: password
    };

    fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                showForm('login');
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Errore durante la registrazione:', error);
            alert('Si è verificato un errore durante la registrazione.');
        });
}

// Funzione per effettuare una prenotazione
function retrieveCourse(event) {
    event.preventDefault();
    if (!userId) {
        alert("Devi effettuare il login per prenotare.");
        showForm('login');
        return;
    }
    retrieveCourseFuntion();
}

function retrieveCourseFuntion() {
    const userEmail = sessionStorage.getItem('userEmail');
    const reservation_date = document.getElementById('dataInput').value;
    sessionStorage.setItem('reservationDate', reservation_date);

     const userData = {
        reservation_date: reservation_date,
        userEmail: userEmail    
    };
    
    fetch('/retrieveCourse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            console.log("Dati JSON ricevuti:", data);
            if (data.success) {
                console.log("Lista prenotazioni:", data.courselist);
                if (data.courselist) {
                    const availableSeats = data.courselist.map(course => ({
                        id: course[0],
                        name: course[1],
                        availableSeats: course[2],
                        weekday: course[3],
                        startTime: course[4],
                        duration: course[5] + ' min.',
                        trainer: course[6] + ' ' + course[7]
                    }));

                    console.log('Available Seats:', availableSeats);
                    activeSubscription= sessionStorage.getItem('activeSubscription')==='true';
                    console.log('Active subscription:', activeSubscription);
                    console.log('Active subscription:', !activeSubscription);

                    showCourse();
                    const tbody = document.querySelector('#availableSeatsTable tbody');
                    tbody.innerHTML = availableSeats.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.availableSeats + ' posti'}</td>
                                <td>${p.startTime}</td>
                                <td>${p.duration}</td>
                                <td>${p.trainer}</td>
                                <td><button title="Verifica se il tuo abbonamento è attivo"
                                        class="prenota-bottone ${p.availableSeats < 1 || !activeSubscription ? 'disabled' : ''}" 
                                        onclick="confirmedReservation('${p.id}')"
                                        ${p.availableSeats < 1 || !activeSubscription ? 'disabled' : ''}>
                                        Prenota
                                    </button></td>
                            </tr>
                        `).join('');
                    //alert(`Prenotazione effettuata per ${userName} il ${data}`);
                    // showForm('home');
                } else {
                    noCourse();
                    console.log('Available Seats:', availableSeats);
                    document.getElementById('availableSeats').style.display = 'none';
                }
            } else {
                console.error("Errore:", data.error);
                noCourse();
            }
        })
        .catch(error => {
            noCourse();
            console.error('ERROR:', error);
            console.error(error);
            //alert('Non sono disponibili corsi per la data selezionata.');
        });

    // Simulazione di prenotazione (in un caso reale, fare una richiesta al server)
    // showForm('home');
}

// Funzione per caricare le prenotazioni
function retrieveReservation() {
    userId = sessionStorage.getItem('userId');
    if (!userId) {
        alert("Devi effettuare il login per visualizzare le prenotazioni.");
        showForm('login');
        return;
    }
    const userData = {
        userId: userId
    };

    fetch('/retrieveReservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            return response.json();
        })
        .then(data => {
            console.log("Dati JSON ricevuti:", data);
            if (data.success) {
                console.log("Lista prenotazioni:", data.reservationlist);
                if (data.reservationlist) {
                    const reservations = data.reservationlist.map(reservation => ({
                        id: reservation[0],

                        name: reservation[1],
                        data: reservation[2],
                        startTime: reservation[3]
                    }));


                    console.log('reservations:', reservations);
                    const tbody = document.querySelector('#prenotazioniTable tbody');
                    tbody.innerHTML = reservations.map(p => `
                            <tr>
                                <td>${p.name}</td>                                
                                <td>${formatDate(p.data) + ' h: '+p.startTime}</td>
                                <td><button class="prenota-bottone" onclick="deleteReservation('${p.id}')">Cancella</button></td>
                            </tr>
                        `).join('');
                    showReservation();
                    //alert(`Prenotazione effettuata per ${userName} il ${data}`);
                    // showForm('home');
                } else {
                    noReservation();
                    alert(res.message);
                }
            } else {
                console.error("Errore:", data.error);
                noReservation();
            }
        })
        .catch(error => {
            console.error('ERROR:', error);
            console.error(error);
            //alert('Non risultano prenotazioni attive.');
            noReservation();
        });




}

// Funzione per effettuare un acquisto
function buySubscription(event) {
    event.preventDefault();
    if (!userId) {
        alert("Devi effettuare il login per acquistare.");
        showForm('login');
        return;
    }

    const subscription = document.getElementById('subscription').value;
    userId = sessionStorage.getItem('userId');
    const userData = {userId: userId,subscription: subscription};       
    buySubscriptionFT(userData);
    //alert(`Abbonamento acquistato per ${abbonamento} mesi.`);
   // showForm('home');
}

function confirmedReservation(courseId) {
    if(!sessionStorage.getItem('activeSubscription')){
        showForm('buySubscription');
    }else if (checkLoggedUser) {
        const user_Name = sessionStorage.getItem('userEmail');
        const userId = sessionStorage.getItem('userId');
        reservationDate = sessionStorage.getItem('reservationDate');
        const userData = {
            userId: userId,
            courseId: courseId,
            reservationDate: reservationDate
        };

        fetch('/confirmedReservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    //alert(`Prenotazione effettuata per ${user_Name} il ${data.reservation_date}`);
                    //showForm('home');
                    refreshRetrieveCourse();

                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Errore durante la prenotazione:', error);
                alert('Si è verificato un errore durante la prenotazione.');
            });
    }
}

function deleteReservation(reservationId) {
    if (checkLoggedUser) {
        const userData = {
            reservationId: reservationId
        };

        fetch('/deleteReservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    refreshRetrieveReservation();
                    //alert(`Prenotazione cancellata !'`);
                    //showForm('showReservation');
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Errore durante la prenotazione:', error);
                alert('Si è verificato un errore durante la prenotazione.');
            });
    }
}

function checkLoggedUser() {
    if (!userId) {
        alert("Devi effettuare il login per visualizzare le prenotazioni.");
        showForm('login');
        return false;
    }
}

function goLogout() {
   
    userId = null;
    noActiveLogin();

        showForm('home'); // Torna alla home
}

function activeLogin() {
    document.getElementById('welcomeMessageHost').style.display = 'none';
    document.getElementById('loginLink').style.display = 'none';
    document.getElementById('logoutLink').style.display = 'block';

    sessionStorage.getItem('userId');

    userName = sessionStorage.getItem('userName');
    userEmail = sessionStorage.getItem('userEmail');
    document.getElementById('userNamePlaceholder').textContent = userName;
    const userData = {userId: userId};
    retrieveSubscription(userData);  


}

function activeSubscription(expiredDate) {
    //expiredDate= sessionStorage.getItem('expiredDate');
    document.getElementById('subExpiredDate').textContent = expiredDate;
    document.getElementById('welcomeSub').style.display = 'block';
    sessionStorage.setItem('activeSubscription', true);

    
}
function noActiveSubscription() {
    document.getElementById('welcomeNoSub').style.display = 'block';
    document.getElementById('welcomeSub').style.display = 'none';
    sessionStorage.setItem('activeSubscription', false);

    
}

function noActiveLogin() {
    document.getElementById('welcomeMessageHost').style.display = 'block';
    document.getElementById('loginLink').style.display = 'block';
    document.getElementById('logoutLink').style.display = 'none';
    document.getElementById('userNamePlaceholder').textContent = '';
    document.getElementById('welcomeNoSub').style.display = 'none';
    document.getElementById('welcomeSub').style.display = 'none';

    sessionStorage.clear();

}

function refreshRetrieveCourse() {
    const tbody = document.querySelector('#availableSeatsTable tbody');
    tbody.innerHTML = '';
    retrieveCourseFuntion();
}

function refreshRetrieveReservation() {
    const tbody = document.querySelector('#prenotazioniTable tbody');
    tbody.innerHTML = '';
    retrieveReservation();
}

function showReservation() {
    document.getElementById('prenotazioniTable').style.display = 'table';
    document.getElementById('noReservation').style.display = 'none';

}

function noReservation() {
    document.getElementById('prenotazioniTable').style.display = 'none';
    document.getElementById('noReservation').style.display = 'block';
}

function showCourse() {
    document.getElementById('noCourse').style.display = 'none';
    document.getElementById('availableSeats').style.display = 'block';

}

function noCourse() {
    document.getElementById('noCourse').style.display = 'block';
    document.getElementById('availableSeats').style.display = 'none';
}



// Mostra la Home di default al caricamento della pagina
window.onload = () => {
    userId = sessionStorage.getItem('userId');
    if (userId) {
        activeLogin();          
    }
    
    showForm('home');
    var today = new Date().toISOString().split('T')[0]; // Ottieni la data odierna in formato YYYY-MM-DD
    var dataInput = document.getElementById("dataInput");
    dataInput.setAttribute('min', today); // Imposta la data minima a oggi
    dataInput.value = today; // Imposta il valore di default a oggi

};

function retrieveSubscription(userData) {
    fetch('/retrieveSubscription', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const subscriptionUser = data.subscriptionList.map(sub => ({
                id: sub[0],
                user_id: sub[1],
                start_date: sub[2],
                end_date: sub[3],
                created_date: sub[4],
                duration: sub[5] + ' giorni'
            }));
            //const endDates = subscriptionUser.map(sub => sub.end_date);
            expiredDate= subscriptionUser[0].end_date
            activeSubscription(formatDate(expiredDate));
        } else {
            noActiveSubscription();
            //alert(data.message);
        }
    })
    .catch(error => {
          console.log('errore:' + error);
                //  alert('Si è verificato un errore durante la prenotazione.');
            }
        );
}

function buySubscriptionFT(userData) {
    fetch('/buySubription', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {   
            showForm('activeSubscription');        
          } else {
            alert(data.message);showForm('home');
             
        }
    })
    .catch(error => {
          console.log('errore:' + error);
                //  alert('Si è verificato un errore durante la prenotazione.');
            }
        );
}

function formatDate(dateInput) {
    const date = new Date(dateInput);
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' , year: 'numeric' };
    const formattedDate = date.toLocaleDateString('it-IT', dateOptions);
    return formattedDate;  
}
