        console.log("JavaScript caricato correttamente! ");

        let userId = null;

        // Mostra di default la Home , se userId è valorizzato allora viene richiamato il metodo activeLogin che mostra informazioni legata all'utenza
        window.onload = () => {
            userId = sessionStorage.getItem('userId');
            if (userId) {
                activeLogin();
            }
            showForm('home');
            document.getElementById("dataInput").setAttribute('min', today());
            document.getElementById("dataInput").value = today();

            // Add loading states to buttons
            const buttons = document.querySelectorAll('input[type="submit"], .custom-button');
            buttons.forEach(button => {
                button.addEventListener('click', function() {
                    this.classList.add('loading');
                    setTimeout(() => {
                        this.classList.remove('loading');
                    }, 2000);
                });
            });

            // Add smooth animations on scroll
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, observerOptions);

            // Observe all form containers
            document.querySelectorAll('.form-container').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'all 0.6s ease-out';
                observer.observe(el);
            });
        };

        //Funzione che restituisce la data odierna
        function today() {
            return new Date().toISOString().split('T')[0];
        }

        // Funzione per attivare/disattivare il menu hamburger
        function activeMenu() {
            const navMenu = document.getElementById('navMenu');
            navMenu.classList.toggle('active');
        }

        // Funzione per mostrare il form selezionato
        function showForm(formId) {
            //Mostra messaggi se loggato o meno 
            if (!userId /*|| sessionStorage.getItem('activeSubscription')*/ ) {
                noActiveLogin();
            } else {
                activeLogin();
            }
            // Nascondi tutti i form
            const forms = document.querySelectorAll('.form-container');
            forms.forEach(form => form.style.display = 'none');

            // Mostra il form selezionato
            const selectedForm = document.getElementById(formId);
            selectedForm.style.display = 'block';

            // Chiudi il menu hamburger (opzionale)
            const navMenu = document.getElementById('navMenu');
            navMenu.classList.remove('active');
            
            // Smooth scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        userId = data.userId;
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

        // Funzione per effettuare registrazione utente
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

        // Funzione per recuperare i corsi prenotabili, viene richiamata dall'utente quando clicca sul relativo menù
        function retrieveCourse(event) {
            event.preventDefault();
            if (!userId) {
                alert("Devi effettuare il login per prenotare.");
                showForm('login');
                return;
            }
            retrieveCourseFuntion();
        }

        // Funzione per recuperare i corsi prenotabili, viene richiamata 2 volte quando l'utente clicca sul relativo menù,
        // oppure successivamente alla prenotazione di un corso viene effettuato il refresh dei corsi disponibili
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
                    if (data.success) {
                        console.log("Dati JSON ricevuti:", data);
                        console.log("Lista prenotazioni:", data.courselist);
                        document.getElementById('selectedDate').textContent = formatDate(reservation_date);

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
                            activeSubscription = sessionStorage.getItem('activeSubscription') === 'true';
                            console.log('Active subscription:', activeSubscription);

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
                                                class="btn btn-primary ${p.availableSeats < 1 || !activeSubscription ? 'disabled' : ''}" 
                                                onclick="confirmedReservation('${p.id}')"
                                                ${p.availableSeats < 1 || !activeSubscription ? 'disabled' : ''}>
                                                Prenota
                                            </button></td>
                                    </tr>
                                `).join('');
                        } else {
                            noCourse();
                            console.log('Available Seats:', availableSeats);
                            document.getElementById('availableSeats').style.display = 'none';
                        }
                    } else {
                        noCourse();
                    }
                })
                .catch(error => {
                    noCourse();
                    console.error('ERROR:', error);
                });
        }

        // Funzione per caricare le prenotazioni effettuate
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
                            const tbody = document.querySelector('#prenotazioniTable tbody');
                            tbody.innerHTML = reservations.map(p => `
                                    <tr>
                                        <td>${p.name}</td>                                
                                        <td>${formatDate(p.data) + ' h: '+p.startTime}</td>
                                        <td><button class="btn btn-danger" onclick="deleteReservation('${p.id}')">Cancella</button></td>
                                    </tr>
                                `).join('');
                            showReservation();
                        } else {
                            noReservation();
                            alert(res.message);
                        }
                    } else {
                        noReservation();
                    }
                })
                .catch(error => {
                    console.error('ERROR:', error);
                    noReservation();
                });
        }

        // Funzione per effettuare un acquisto di abbonamento
        function buySubscription(event) {
            event.preventDefault();
            if (!userId) {
                alert("Devi effettuare il login per acquistare.");
                showForm('login');
                return;
            }

            const subscription = document.getElementById('subscription').value;
            userId = sessionStorage.getItem('userId');
            const userData = {
                userId: userId,
                subscription: subscription
            };
            buySubscriptionFT(userData);
        }

        // Funzione per confermare prenotazione
        function confirmedReservation(courseId) {
            if (!sessionStorage.getItem('activeSubscription')) {
                showForm('buySubscription');
            } else if (checkLoggedUser) {
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

        // Funzione per cancellare  prenotazioni, 
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

        // Funzione per recuperare le info sull'abbonamento
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
                        expiredDate = subscriptionUser[0].end_date
                        let expiredDateFormat = new Date(subscriptionUser[0].end_date);
                        if (expiredDateFormat.toISOString().split('T')[0] >= today()) {
                            activeSubscriptionFT(expiredDate);
                        } else {
                            noActiveSubscription();
                            console.log('La sottoscrizione è scaduta.');
                        }
                    } else {
                        noActiveSubscription();
                    }
                })
                .catch(error => {
                    console.log('errore:' + error);
                });
        }

        // Funzione per effettuare un acquisto di abbonamento
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
                        alert(data.message);
                        showForm('home');
                    }
                })
                .catch(error => {
                    console.log('errore:' + error);
                });
        }

        //Funzione per formattare la data 
        function formatDate(dateInput) {
            const date = new Date(dateInput);
            const dateOptions = {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            };
            const formattedDate = date.toLocaleDateString('it-IT', dateOptions);
            return formattedDate;
        }

        //Funzione che mostra alert se un utente non è loggato 
        function checkLoggedUser() {
            if (!userId) {
                alert("Devi effettuare il login per visualizzare le prenotazioni.");
                showForm('login');
                return false;
            }
        }

        //Funzione per effettuare logout
        function goLogout() {
            userId = null;
            noActiveLogin();
            showForm('home'); // Torna alla home
        }

        //Funzione che modifica elementi del DOM se l'utente è loggato
        function activeLogin() {
            document.getElementById('welcomeMessageHost').style.display = 'none';
            document.getElementById('loginLink').style.display = 'none';
            document.getElementById('logoutLink').style.display = 'block';

            sessionStorage.getItem('userId');

            userName = sessionStorage.getItem('userName');
            userEmail = sessionStorage.getItem('userEmail');
            document.querySelectorAll("#userNamePlaceholder").forEach(el => {
                el.textContent = userName;
            });
            document.getElementById('logoPlaceholder').textContent = '- ' + userName.split(" ")[0];
            const userData = {
                userId: userId
            };
            retrieveSubscription(userData);
        }

        //Funzione che modifica elementi del DOM se l'utente è abbonato
        function activeSubscriptionFT(expiredDate) {
            document.getElementById('subExpiredDate').textContent = formatDate(expiredDate);
            document.getElementById('welcomeSub').style.display = 'block';
            sessionStorage.setItem('activeSubscription', true);
        }

        //Funzione che modifica elementi del DOM se l'utente NON è abbonato
        function noActiveSubscription() {
            document.getElementById('welcomeNoSub').style.display = 'block';
            document.getElementById('welcomeSub').style.display = 'none';
            sessionStorage.setItem('activeSubscription', false);
        }

        //Funzione che modifica elementi del DOM se l'utente NON è loggato
        function noActiveLogin() {
            document.getElementById('welcomeMessageHost').style.display = 'block';
            document.getElementById('loginLink').style.display = 'block';
            document.getElementById('logoutLink').style.display = 'none';
            document.querySelectorAll("#userNamePlaceholder").forEach(el => {
                el.textContent = '';
            });
            document.getElementById('welcomeNoSub').style.display = 'none';
            document.getElementById('logoPlaceholder').textContent = '';
            document.getElementById('welcomeSub').style.display = 'none';
            sessionStorage.clear();
        }

        //Funzione che modifica elementi del DOM per refreshare i corsi disponibili
        function refreshRetrieveCourse() {
            const tbody = document.querySelector('#availableSeatsTable tbody');
            tbody.innerHTML = '';
            retrieveCourseFuntion();
        }

        //Funzione che modifica elementi del DOM per refreshare le prenotazioni attive
        function refreshRetrieveReservation() {
            const tbody = document.querySelector('#prenotazioniTable tbody');
            tbody.innerHTML = '';
            retrieveReservation();
        }

        //Funzione che modifica elementi del DOM se ci sono prenotazioni
        function showReservation() {
            document.getElementById('prenotazioniTable').style.display = 'table';
            document.getElementById('noReservation').style.display = 'none';
        }

        //Funzione che modifica elementi del DOM se NON ci sono prenotazioni
        function noReservation() {
            document.getElementById('prenotazioniTable').style.display = 'none';
            document.getElementById('noReservation').style.display = 'block';
        }

        //Funzione che modifica elementi del DOM se ci sono corsi disponibili
        function showCourse() {
            document.getElementById('noCourse').style.display = 'none';
            document.getElementById('availableSeats').style.display = 'block';
        }

        //Funzione che modifica elementi del DOM se NON ci sono corsi disponibili
        function noCourse() {
            document.getElementById('noCourse').style.display = 'block';
            document.getElementById('availableSeats').style.display = 'none';
        }
