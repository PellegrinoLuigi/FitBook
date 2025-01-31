
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
                if (formId === 'showReservation') {
                    retrieveReservation();
                }
              //  document.getElementById('userName').textContent = loggedInUser.email;
            }
        }

        // Funzione per effettuare il login
        function login(event) {
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
                    showForm('home');
                    sessionStorage.setItem('loggedInUser',loggedInUser);      
                    sessionStorage.setItem('userName',data.userFullName);   
                    sessionStorage.setItem('userEmail',data.userEmail);      
                    sessionStorage.setItem('userId',data.userId);            
                    activeLogin();               
                     
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
        function retrieveCourse(event) {
            event.preventDefault();
            if (!loggedInUser) {
                alert("Devi effettuare il login per prenotare.");
                showForm('login');
                return;
            }
            const user_Name = sessionStorage.getItem('userEmail'); 
            const data = document.getElementById('date').value;
            sessionStorage.setItem('reservationDate',data); 
            const userData = {
                userName: user_Name,
                reservation_date: data
               
            };
            
            fetch('/retrieveCourse', {  
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(userData)
            })
            .then(response =>{ return response.json();})
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
                            duration:course[5]+' min.',
                            trainer:course[6] + ' ' + course[7]
                        }));
            
                        console.log('Available Seats:', availableSeats);
                        document.getElementById('availableSeats').style.display = 'block';
                        const tbody = document.querySelector('#availableSeatsTable tbody');
                        tbody.innerHTML = availableSeats.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.availableSeats}</td>
                                <td>${p.startTime}</td>
                                <td>${p.duration}</td>
                                <td>${p.trainer}</td>
                                <td><button class="prenota-bottone" onclick="confirmedReservartion('${p.id}')">Prenota</button></td>
                            </tr>
                        `).join('');
                        //alert(`Prenotazione effettuata per ${userName} il ${data}`);
                       // showForm('home');
                    } else {
                        alert(res.message);
                    }
                } else {
                    console.error("Errore:", data.error);
                    alert("Errore nella richiesta: " + data.error);
                }
            })            
            .catch(error => {
                console.error('ERROR:', error);
                console.error( error);
                alert('Non sono disponibili corsi per la data selezionata.');
            });

            // Simulazione di prenotazione (in un caso reale, fare una richiesta al server)
           // showForm('home');
        }

        // Funzione per caricare le prenotazioni
        function retrieveReservation() {
            if (!loggedInUser) {
                alert("Devi effettuare il login per visualizzare le prenotazioni.");
                showForm('login');
                return;
            }
            const userId = sessionStorage.getItem('userId'); 
            const userData = {userId: userId };

            fetch('/retrieveReservation', {  
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(userData)
            })
            .then(response =>{ return response.json();})
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
                                <td>${p.data}</td>
                                <td>${p.startTime}</td>
                                <td><button class="prenota-bottone" onclick="deleteReservation('${p.id}')">Cancella</button></td>
                            </tr>
                        `).join('');
                       
                        //alert(`Prenotazione effettuata per ${userName} il ${data}`);
                       // showForm('home');
                    } else {
                        alert(res.message);
                    }
                } else {
                    console.error("Errore:", data.error);
                    alert("Errore nella richiesta: " + data.error);
                }
            })            
            .catch(error => {
                console.error('ERROR:', error);
                console.error( error);
                alert('Non risultano prenotazioni attive.');
            });

           

            
        }

        // Funzione per effettuare un acquisto
        function buySub(event) {
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
                activeLogin();
            }
            showForm('home');
           
        };

        function confirmedReservartion(courseId) {
            if(checkLoggedUser){
                const user_Name = sessionStorage.getItem('userEmail'); 
                const userId = sessionStorage.getItem('userId'); 
                reservationDate = sessionStorage.getItem('reservationDate');
                const userData = {
                    userId: userId,
                    courseId: courseId,
                    reservationDate: reservationDate
                };
                
                fetch('/confirmedReservartion', {  
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(userData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`Prenotazione effettuata per ${user_Name} il ${data.reservation_date}`);
                        showForm('home');
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    console.error('Errore durante la prenotazione:', error);
                    alert('Si è verificato un errore durante la prenotazione.');
            }
            );
            }
        }

        function deleteReservation(reservationId) {
            if(checkLoggedUser){               
                const userData = {
                    reservationId: reservationId                    
                };
                
                fetch('/deleteReservation', {  
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(userData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`Prenotazione cancellata !'`);
                        showForm('showReservation');
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    console.error('Errore durante la prenotazione:', error);
                    alert('Si è verificato un errore durante la prenotazione.');
            }
            );
            }
        }

        function checkLoggedUser() {
            if (!loggedInUser) {
                alert("Devi effettuare il login per visualizzare le prenotazioni.");
                showForm('login');
                return false;
            }
        }

        function effettuaLogout() {
            sessionStorage.removeItem('loggedInUser');
            loggedInUser = null;
            document.getElementById('welcomeMessageHost').style.display = 'block';
            document.getElementById('welcomeMessage').style.display = 'none';
            document.getElementById('loginLink').style.display = 'block';
            document.getElementById('logoutLink').style.display = 'none';
            showForm('home'); // Torna alla home
        }

        function activeLogin(){
            document.getElementById('welcomeMessageHost').style.display = 'none';
            document.getElementById('welcomeMessage').style.display = 'block';
            document.getElementById('loginLink').style.display = 'none';
            document.getElementById('logoutLink').style.display = 'block';

            sessionStorage.getItem('loggedInUser');   

            userName  = sessionStorage.getItem('userName');   
            userEmail = sessionStorage.getItem('userEmail');      
            document.getElementById('userNamePlaceholder').textContent = userName;
            document.getElementById('userEmailPlaceholder').textContent = userEmail;


           // sessionStorage.setItem('loggedInUser',loggedInUser); 
        }
        function noActiveLogin(){
            document.getElementById('welcomeMessageHost').style.display = 'block';
            document.getElementById('welcomeMessage').style.display = 'none';
            document.getElementById('loginLink').style.display = 'block';
            document.getElementById('logoutLink').style.display = 'none';
            document.getElementById('userNamePlaceholder').textContent = '';
            document.getElementById('userEmailPlaceholder').textContent = '';
        }

    
