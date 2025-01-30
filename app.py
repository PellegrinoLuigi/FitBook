import os
from flask import Flask, render_template, request, jsonify
import psycopg2

app = Flask(__name__, static_folder='static')

# Configurazione del database tramite variabili d'ambiente configurate su Render.com
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT', 5432)  # Porta di default

QUERY_ALL_USER="SELECT id, nome, cognome, email, data_di_nascita FROM users;"
QUERY_LOGGED_USER="SELECT first_name,last_name,email  FROM users WHERE email = %s AND password = %s;"
QUERY_EMAIL_FILTERED_USER="SELECT * FROM users WHERE email = %s;"

QUERY_CHECK_RESERVATION =  """
SELECT course.id, course.name, course.capacity - COALESCE(reservation_count, 0) AS available_seats, 
       course.weekday, course.start_time, course.duration, trainer.first_name, trainer.last_name 
FROM course 
LEFT JOIN ( 
    SELECT course_id, COUNT(*) AS reservation_count 
    FROM reservation 
    WHERE reservation_date = %s
    GROUP BY course_id 
) AS reservations ON course.id = reservations.course_id 
JOIN trainer ON course.trainer_id = trainer.id 
WHERE course.weekday = TO_CHAR(TO_DATE(%s, 'YYYY-MM-DD'), 'FMDay') 
AND course.id NOT IN ( 
    SELECT course_id 
    FROM reservation 
    JOIN users ON reservation.user_id = users.id 
    WHERE users.email = %s 
);
"""

QUERY_CHECK_RESERVATION2= "SELECT course.id, course.name, course.capacity,course.weekday, course.start_time, course.duration FROM course;"

query_test=""" SELECT course_id
    FROM reservation 
    WHERE reservation_date >= %s   and reservation_date <= %s  """

 
# Stringa di connessione al db
conn_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}"

# Connessione al DB Postgres tramite psycopg2
def get_db_connection():
    try:
        conn = psycopg2.connect(conn_string)
        return conn
    except Exception as e:
        print(f"Errore durante la connessione al database: {e}")
        return None

@app.route('/checkEmail', methods=['POST'])
def checkEmail(email):
    """Funzione per verificare se l'email esiste già nel DB"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(QUERY_EMAIL_FILTERED_USER, email)
        user = cursor.fetchone()
        conn.close()
        return user is not None
    except Exception as e:
        print(f"Errore nel connettersi al DB: {e}")
        return False

#Funzione per registrare un nuovo utente nel DB
def userRegister(first_name, last_name, email, birthdate, password):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (first_name, last_name, email, birthdate, password) VALUES (%s, %s, %s, %s, %s)",
                       (first_name, last_name, email, birthdate, password))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Errore nel registrare l'utente: {e}")
        return False


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    birthdate = data.get('birthdate')
    password = data.get('password')

    if checkEmail(email):
        return jsonify({"success": False, "message": "L'email è già registrata."})    
    if userRegister(first_name, last_name, email, birthdate, password):
        return jsonify({"success": True, "message": "Registrazione avvenuta con successo!"})
    else:
        return jsonify({"success": False, "message": "Errore durante la registrazione."})

#Recupera i dati dalla tabella user.
def getUsers():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()        
        cursor.execute(QUERY_ALL_USER)
        rows = cursor.fetchall()  # Recupera tutti i record
        conn.close()        
        return rows
    except Exception as e:
        # Stampa l'errore a schermo
        print(f"Errore durante la connessione al database o l'esecuzione della query: {e}")
        return []

#Funzione per verificare se l'utente esiste nel DB
def loginUser(email, password):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(QUERY_LOGGED_USER, (email, password))
        user = cursor.fetchone()
        conn.close()
        if user:
            return True
        else:
            return False
    except Exception as e:
        print(f"Errore nel connettersi al DB: {e}")
        return False


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()  # Riceve i dati come JSON
    email = data.get('email')
    password = data.get('password')
    #if loginUser(email, password):
    result = db_request_select(QUERY_LOGGED_USER,email, password)
    if result:
        return jsonify({"success": True, "userFullName":result[0] + " " + result[1],"userEmail":result[2] })
    else:
        return jsonify({"success": False, "message": "Credenziali errate."})



@app.route('/checkReservation', methods=['POST'])
def check_reservation():
    try:
        data = request.get_json()
        user_email = data.get('userName')
        reservation_date = data.get('reservation_date')
        reservation_date2 = data.get('reservation_date')
        resdate='2025-01-31'     

      
        result =db_request_select_all2(QUERY_CHECK_RESERVATION,( resdate,reservation_date2,user_email))
       # result =db_request_select_all2(query_test,resdate,resdate)

        if result:
            return jsonify({"success": True, "reservationlist": result})
        else:
            print("Nessun risultato trovato")
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def checkReservation():
    try:
        resdate='2025-01-31'
        resemail='mario.rossi@example.com'        
        result =db_request_select_all2(query_test,(resdate))
        if result:
            return jsonify({"success": True, "reservationlist": reservationlist})
        else:
            print("Nessun risultato trovato")
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def db_request_select(query, *params):
    conn = get_db_connection()
    cursor = conn.cursor()
    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)    
    result = cursor.fetchone()
    conn.close()
    return result

def db_request_select_all(query, *params):
    conn = get_db_connection()
    cursor = conn.cursor()
    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)    
    result = cursor.fetchall()
    conn.close()
    return result
def db_request_select_all2(query, par1,par2,par3):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, (par1,par2,par3))
    result = cursor.fetchall()
    conn.close()
    return result

@app.route('/')
def home():
    users = checkReservation()
    utente='cavolo'
    return render_template('index.html',utente=utente, users=users)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Usa la porta specificata da Render 
    app.run(host='0.0.0.0', port=port, debug=True)
