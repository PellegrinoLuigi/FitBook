import os
from flask import Flask, render_template, request, jsonify
from datetime import datetime

import psycopg2

app = Flask(__name__, static_folder="static")

# Configurazione del database tramite variabili d'ambiente configurate su Render.com
db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT", 5432)  # Porta di default

QUERY_LOGGED_USER = "SELECT first_name,last_name,email,id  FROM users WHERE email = %s AND password = %s;"
QUERY_EMAIL_FILTERED_USER = "SELECT * FROM users WHERE email = %s;"
QUERY_NEW_USER="INSERT INTO users (first_name, last_name, email, birthdate, password) VALUES (%s, %s, %s, %s, %s)"


QUERY_CHECK_RESERVATION = """SELECT course.id, course.name, course.capacity - COALESCE(reservation_count, 0) AS available_seats, 
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
                                AND reservation.reservation_date = %s
                               	AND reservation.reservation_status = 'Confirmed'
                            ) order by start_time;"""

QUERY_BOOK_COURSE = "INSERT INTO reservation (user_id, course_id, reservation_date, reservation_status) VALUES (%s, %s, %s, %s);"
QUERY_BOOKED_COURSES = """SELECT r.id as reservation_id, c.name AS course_name,DATE(r.reservation_date) AS reservation_date , c.start_time AS reservation_time 
                     FROM reservation r
                     JOIN course c ON r.course_id = c.id
                     WHERE   r.reservation_status = 'Confirmed'
                     AND r.user_id = %s  AND reservation_date>=CURRENT_DATE;"""

QUERY_DELETE_RESERVATION = "DELETE FROM reservation WHERE id = %s;"
QUERY_LOGICAL_DELETE_RESERVATION = "UPDATE reservation SET reservation_status = 'Cancelled' WHERE id = %s;"
QUERY_GET_SUBSCRIPTION ="SELECT * FROM user_subscription where user_id = %s;"
QUERY_UPSERT_SUBSCRIPTION="""INSERT INTO user_subscription (user_id, start_date, subscription_days) 
                            VALUES (%s, %s, %s)
                            ON CONFLICT (user_id) 
                            DO UPDATE SET 
                                subscription_days = user_subscription.subscription_days + EXCLUDED.subscription_days,
                                start_date = user_subscription.start_date;"""

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
      
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    birthdate = data.get("birthdate")
    password = data.get("password")

    if checkEmail(email):
        return jsonify({"success": False, "message": "L'email è già registrata."})
    if userRegister(first_name, last_name, email, birthdate, password):
        return jsonify(
            {"success": True, "message": "Registrazione avvenuta con successo!"}
        )
    else:
        return jsonify(
            {"success": False, "message": "Errore durante la registrazione."}
        )

#Funzione per verificare se l'email esiste già nel DB
def checkEmail(email):
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


# Funzione per registrare un nuovo utente nel DB
def userRegister(first_name, last_name, email, birthdate, password):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(QUERY_NEW_USER,(first_name, last_name, email, birthdate, password),)
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Errore nel registrare l'utente: {e}")
        return False

# Funzione per verificare se l'utente esiste nel DB
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()  # Riceve i dati come JSON
    email = data.get("email")
    password = data.get("password")
    result = db_request_select(QUERY_LOGGED_USER, email, password)
    if result:
        return jsonify(
            {
                "success": True,
                "userFullName": result[0] + " " + result[1],
                "userEmail": result[2],
                "userId": result[3],
            }
        )
    else:
        return jsonify({"success": False, "message": "Credenziali errate."})

# Funzione per recuperare i corsi prenotabili dall'utente loggato
@app.route("/retrieveCourse", methods=["POST"])
def retrieveCourse():
    try:
        data = request.get_json()
        user_email = data.get("userName")
        reservation_date = data.get("reservation_date")
        reservation_date2 = data.get("reservation_date")
        reservation_date3 = data.get("reservation_date")

        result = db_request_select_all_4_params(
            QUERY_CHECK_RESERVATION,
            reservation_date,
            reservation_date2,
            user_email,
            reservation_date3,
        )
        # in errore di tuple index out of range"
        # result =db_request_select_all(QUERY_CHECK_RESERVATION,(reservation_date,reservation_date2,user_email))

        if result:
            return jsonify({"success": True, "courselist": result})
        else:
            print("Nessun risultato trovato")
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Funzione per confermare una prenotazione 
@app.route("/confirmedReservation", methods=["POST"])
def confirmedReservation():
    data = request.get_json()  # Riceve i dati come JSON
    userId = data.get("userId")
    courseId = data.get("courseId")
    reservationDate = data.get("reservationDate")
    reservation_status = "Confirmed"
    result = book(userId, courseId, reservationDate, reservation_status)
    if result:
        return jsonify(
            {"success": True, "message": "Prenotazione effettuata con successo!"}
        )
    else:
        return jsonify({"success": False, "message": "Errore durante la prenotazione."})


def book(userId, courseId, reservationDate, reservation_status):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # "INSERT INTO reservation (user_id, course_id, reservation_date, reservation_status) VALUES (%s, %s, %s, %s);
        cursor.execute(
            QUERY_BOOK_COURSE, (userId, courseId, reservationDate, reservation_status)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Errore nel registrare prenotazione: {e}")
        return False

# Funzione per cancellare una prenotazione 
@app.route("/deleteReservation", methods=["POST"])
def deleteReservation():
    data = request.get_json()  # Riceve i dati come JSON
    reservationId = data.get("reservationId")
    result = deleteRes(reservationId)
    if result:
        return jsonify(
            {"success": True, "message": "Prenotazione cancellata con successo!"}
        )
    else:
        return jsonify({"success": False, "message": "Errore durante la cancellazione della prenotazione."})


def deleteRes(reservationId):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(QUERY_LOGICAL_DELETE_RESERVATION, (reservationId,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Errore nel CANCELLARE prenotazione: {e}")
        return False

# Funzione per recuperare le prenotazioni dell'utente loggato 
@app.route("/retrieveReservation", methods=["POST"])
def retrieveReservation():
    data = request.get_json()
    userId = data.get("userId")
    result = db_request_select_all(QUERY_BOOKED_COURSES, userId)
    if result:
        return jsonify({"success": True, "reservationlist": result})
    else:
        return jsonify({"success": False, "message": "Errore durante la prenotazione."})

@app.route("/retrieveSubscription", methods=["POST"])
def retrieveSubscription():
    data = request.get_json()
    userId = data.get("userId")
    result = db_request_select_all(QUERY_GET_SUBSCRIPTION, userId)
    if result:
        return jsonify({"success": True, "subscriptionList": result})
    else:
        return jsonify({"success": False, "message": "Non è presente un abbonamento attivo."})

@app.route("/buySubription", methods=["POST"])
def buySubription():
    data = request.get_json()
    userId = data.get("userId")
    subscription = data.get("subscription")
    today = datetime.today()
    formattedToday = today.strftime('%Y-%m-%d')
    result = db_request_insert(QUERY_UPSERT_SUBSCRIPTION, userId,formattedToday,subscription)
    if result:
        return jsonify({"success": True, "message": "Abbonamento acquistato con successo!"})
    else:
        return jsonify({"success": False, "message": "Errore durante l'acquisto dell'abbonamento."})

def db_request_insert(query, *params):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        conn.commit()  # Conferma l'inserimento nel database
        success = True
    except Exception as e:
        print(f"Errore durante l'INSERT: {e}")
        conn.rollback()  # In caso di errore, annulla la transazione
        success = False
    finally:
        cursor.close()
        conn.close()
    return success
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


def db_request_select_all_3_params(query, par1, par2, par3):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, (par1, par2, par3))
    result = cursor.fetchall()
    conn.close()
    return result


def db_request_select_all_4_params(query, par1, par2, par3, par4):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, (par1, par2, par3, par4))
    result = cursor.fetchall()
    conn.close()
    return result


@app.route("/")
def home():
    #users=users
    return render_template("index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Usa la porta specificata da Render
    app.run(host="0.0.0.0", port=port, debug=True)
