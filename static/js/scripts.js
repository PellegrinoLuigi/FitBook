
console.log("JavaScript caricato correttamente!");


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
            if (!loggedInUser) {
                noActiveLogin();
            }else{
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
            if (!loggedInUser) {
                //alert("Devi effettuare il login per accedere a questa funzionalità.");
                showForm('login');
                noActiveLogin();
            } else {
                showForm(formId);
                activeLogin();
                if (formId === 'mostraPrenotazioni') {
                    caricaPrenotazioni();
                }
                document.getElementById('userName').textContent = loggedInUser.email;
            }
        }

        // Funzione per effettuare il login
        function effettuaLogin(event) {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            fetch('/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loggedInUser = { email };
                    activeLogin();
                    showForm('home');
                    sessionStorage.setItem('loggedInUser',loggedInUser);                   
                    document.getElementById('userName').textContent = loggedInUser.email;
                } else {
                    alert(data.message || "Login fallito. Controlla email e password.");
                }
            })
            .catch(error => {
                console.error("Errore durante il login:", error);
                alert("Si è verificato un errore. Riprova più tardi.");
            });
        }        

        function effettuaRegistrazione(event) {
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
                headers: {'Content-Type': 'application/json'},
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
        function effettuaPrenotazione(event) {
            event.preventDefault();
            if (!loggedInUser) {
                alert("Devi effettuare il login per prenotare.");
                showForm('login');
                return;
            }

            const user_Name = document.getElementById('userEmail').value;
            const data = document.getElementById('date').value;
            const userData = {
                userName: user_Name,
                data: data
               
            };
            
            fetch('/checkReservation', {  
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(userData)
            })
            .then(response =>{console.log(response); response.json()})
            .then(res => {
                console.log('res');
                console.log(res);
                if (res) {
                    const availableSeats = res.reservationlist.map(course => ({
                        id: course.id,
                        name: course.name,
                        availableSeats: course.available_seats,
                        weekday: course.weekday,
                        startTime: course.start_time,
                        duration: course.duration,
                        trainer: `${course.first_name} ${course.last_name}`
                    }));
        
                    console.log('Available Seats:', availableSeats);
        
                    const tbody = document.querySelector('#availableSeatsTable tbody');
                    tbody.innerHTML = availableSeats.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.availableSeats}</td>
                            <td>${p.startTime}</td>
                            <td>${p.duration}</td>
                            <td>${p.trainer}</td>
                        </tr>
                    `).join('');
                    //alert(`Prenotazione effettuata per ${userName} il ${data}`);
                   // showForm('home');
                } else {
                    alert(res.message);
                }
            })
            .catch(error => {
                console.error('Errore durante la registrazione:', error);
                alert('Si è verificato un errore durante la registrazione.');
            });

            // Simulazione di prenotazione (in un caso reale, fare una richiesta al server)
           // showForm('home');
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
        window.onload = () => {
            // Leggi la variabile di sessione
            loggedInUser = sessionStorage.getItem('loggedInUser');
            if(loggedInUser){
                document.getElementById('welcomeMessageHost').style.display = 'none';
                document.getElementById('welcomeMessage').style.display = 'block';
                document.getElementById('loginLink').style.display = 'none';
                document.getElementById('logoutLink').style.display = 'block';
                document.getElementById('userName').textContent = loggedInUser.email;
            }
            showForm('home');
           
        };
        function effettuaLogout() {
            sessionStorage.removeItem('loggedInUser');
            loggedInUser = null;
            document.getElementById('welcomeMessageHost').style.display = 'block';
            document.getElementById('welcomeMessage').style.display = 'none';
            document.getElementById('loginLink').style.display = 'block';
            document.getElementById('logoutLink').style.display = 'none';
            document.querySelector('a[href="#"]').style.display = 'block'; // Mostra di nuovo il link di login
            showForm('home'); // Torna alla home
        }

        function activeLogin(){
            document.getElementById('welcomeMessageHost').style.display = 'none';
            document.getElementById('welcomeMessage').style.display = 'block';
            document.getElementById('loginLink').style.display = 'none';
            document.getElementById('logoutLink').style.display = 'block';
        }
        function noActiveLogin(){
            document.getElementById('welcomeMessageHost').style.display = 'block';
            document.getElementById('welcomeMessage').style.display = 'none';
            document.getElementById('loginLink').style.display = 'block';
            document.getElementById('logoutLink').style.display = 'none';
        }
    
