import os
import logging
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
import re

# Configurazione logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="static")
CORS(app)

# Configurazione del database
class DatabaseConfig:
    def __init__(self):
        self.db_name = os.getenv("DB_NAME")
        self.db_user = os.getenv("DB_USER") 
        self.db_password = os.getenv("DB_PASSWORD")
        self.db_host = os.getenv("DB_HOST")
        self.db_port = os.getenv("DB_PORT", 5432)
        
        # Validazione configurazione
        if not all([self.db_name, self.db_user, self.db_password, self.db_host]):
            raise ValueError("Configurazione database incompleta")
    
    @property
    def connection_string(self):
        return f"dbname={self.db_name} user={self.db_user} password={self.db_password} host={self.db_host} port={self.db_port}"

db_config = DatabaseConfig()

# Query SQL organizzate
class Queries:
    # User queries
    GET_USER_BY_EMAIL_PASSWORD = """
        SELECT id, first_name, last_name, email, password 
        FROM users WHERE email = %s
    """
    
    CHECK_EMAIL_EXISTS = "SELECT 1 FROM users WHERE email = %s"
    
    CREATE_USER = """
        INSERT INTO users (first_name, last_name, email, birthdate, password) 
        VALUES (%s, %s, %s, %s, %s) RETURNING id
    """
    
    # Course queries
    GET_AVAILABLE_COURSES = """
        SELECT 
            c.id, c.name, 
            c.capacity - COALESCE(r.reservation_count, 0) AS available_seats,
            c.weekday, c.start_time, c.duration,
            t.first_name, t.last_name
        FROM course c
        LEFT JOIN (
            SELECT course_id, COUNT(*) AS reservation_count 
            FROM reservation 
            WHERE DATE(reservation_date) = %s 
            AND reservation_status = 'Confirmed'
            GROUP BY course_id 
        ) r ON c.id = r.course_id 
        JOIN trainer t ON c.trainer_id = t.id 
        WHERE c.weekday = TO_CHAR(TO_DATE(%s, 'YYYY-MM-DD'), 'FMDay')
        AND c.id NOT IN (
            SELECT course_id 
            FROM reservation 
            WHERE user_id = %s
            AND DATE(reservation_date) = %s
            AND reservation_status = 'Confirmed'
        ) 
        ORDER BY c.start_time
    """
    
    # Reservation queries
    CREATE_RESERVATION = """
        INSERT INTO reservation (user_id, course_id, reservation_date, reservation_status) 
        VALUES (%s, %s, %s, %s) RETURNING id
    """
    
    GET_USER_RESERVATIONS = """
        SELECT r.id, c.name, DATE(r.reservation_date), c.start_time 
        FROM reservation r
        JOIN course c ON r.course_id = c.id
        WHERE r.reservation_status = 'Confirmed'
        AND r.user_id = %s 
        AND DATE(r.reservation_date) >= CURRENT_DATE 
        ORDER BY r.reservation_date, c.start_time
    """
    
    CANCEL_RESERVATION = """
        UPDATE reservation 
        SET reservation_status = 'Cancelled' 
        WHERE id = %s AND user_id = %s
    """
    
    # Subscription queries
    GET_USER_SUBSCRIPTION = """
        SELECT id, user_id, start_date, end_date, created_at, subscription_days
        FROM user_subscription 
        WHERE user_id = %s
    """
    
    UPSERT_SUBSCRIPTION = """
        INSERT INTO user_subscription (user_id, start_date, subscription_days) 
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            subscription_days = user_subscription.subscription_days + EXCLUDED.subscription_days,
            start_date = CASE 
                WHEN user_subscription.end_date < CURRENT_DATE THEN EXCLUDED.start_date
                ELSE user_subscription.start_date
            END
        RETURNING id
    """

# Database connection manager
class DatabaseManager:
    @staticmethod
    def get_connection():
        try:
            conn = psycopg2.connect(
                db_config.connection_string,
                cursor_factory=RealDictCursor
            )
            return conn
        except Exception as e:
            logger.error(f"Errore connessione database: {e}")
            return None
    
    @staticmethod
    def execute_query(query, params=None, fetch_one=False, fetch_all=False):
        conn = None
        try:
            conn = DatabaseManager.get_connection()
            if not conn:
                return None
                
            with conn.cursor() as cursor:
                cursor.execute(query, params or ())
                
                if fetch_one:
                    return cursor.fetchone()
                elif fetch_all:
                    return cursor.fetchall()
                else:
                    conn.commit()
                    return True
                    
        except Exception as e:
            logger.error(f"Errore query database: {e}")
            if conn:
                conn.rollback()
            return None
        finally:
            if conn:
                conn.close()

# Validation utilities
class Validator:
    @staticmethod
    def validate_email(email):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_password(password):
        return len(password) >= 6
    
    @staticmethod
    def validate_date(date_string):
        try:
            datetime.strptime(date_string, '%Y-%m-%d')
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_required_fields(data, required_fields):
        missing_fields = [field for field in required_fields if not data.get(field)]
        return missing_fields

# User service
class UserService:
    @staticmethod
    def authenticate_user(email, password):
        try:
            user = DatabaseManager.execute_query(
                Queries.GET_USER_BY_EMAIL_PASSWORD, 
                (email,), 
                fetch_one=True
            )
            
            if user and check_password_hash(user['password'], password):
                return {
                    'id': user['id'],
                    'first_name': user['first_name'],
                    'last_name': user['last_name'],
                    'email': user['email']
                }
            return None
            
        except Exception as e:
            logger.error(f"Errore autenticazione: {e}")
            return None
    
    @staticmethod
    def email_exists(email):
        result = DatabaseManager.execute_query(
            Queries.CHECK_EMAIL_EXISTS, 
            (email,), 
            fetch_one=True
        )
        return result is not None
    
    @staticmethod
    def create_user(first_name, last_name, email, birthdate, password):
        try:
            hashed_password = generate_password_hash(password)
            result = DatabaseManager.execute_query(
                Queries.CREATE_USER,
                (first_name, last_name, email, birthdate, hashed_password)
            )
            return result is not None
            
        except Exception as e:
            logger.error(f"Errore creazione utente: {e}")
            return False

# Course service
class CourseService:
    @staticmethod
    def get_available_courses(user_id, reservation_date):
        try:
            return DatabaseManager.execute_query(
                Queries.GET_AVAILABLE_COURSES,
                (reservation_date, reservation_date, user_id, reservation_date),
                fetch_all=True
            )
        except Exception as e:
            logger.error(f"Errore recupero corsi: {e}")
            return None

# Reservation service
class ReservationService:
    @staticmethod
    def create_reservation(user_id, course_id, reservation_date):
        try:
            # Verifica abbonamento attivo
            if not SubscriptionService.has_active_subscription(user_id):
                return False, "Abbonamento non attivo"
            
            result = DatabaseManager.execute_query(
                Queries.CREATE_RESERVATION,
                (user_id, course_id, reservation_date, 'Confirmed')
            )
            return result is not None, "Prenotazione completata" if result else "Errore prenotazione"
            
        except Exception as e:
            logger.error(f"Errore creazione prenotazione: {e}")
            return False, "Errore del sistema"
    
    @staticmethod
    def get_user_reservations(user_id):
        try:
            return DatabaseManager.execute_query(
                Queries.GET_USER_RESERVATIONS,
                (user_id,),
                fetch_all=True
            )
        except Exception as e:
            logger.error(f"Errore recupero prenotazioni: {e}")
            return None
    
    @staticmethod
    def cancel_reservation(reservation_id, user_id):
        try:
            result = DatabaseManager.execute_query(
                Queries.CANCEL_RESERVATION,
                (reservation_id, user_id)
            )
            return result is not None
            
        except Exception as e:
            logger.error(f"Errore cancellazione prenotazione: {e}")
            return False

# Subscription service
class SubscriptionService:
    @staticmethod
    def get_user_subscription(user_id):
        try:
            return DatabaseManager.execute_query(
                Queries.GET_USER_SUBSCRIPTION,
                (user_id,),
                fetch_one=True
            )
        except Exception as e:
            logger.error(f"Errore recupero abbonamento: {e}")
            return None
    
    @staticmethod
    def has_active_subscription(user_id):
        subscription = SubscriptionService.get_user_subscription(user_id)
        if not subscription:
            return False
        
        today = date.today()
        return subscription['end_date'] >= today
    
    @staticmethod
    def create_or_extend_subscription(user_id, days):
        try:
            today = date.today()
            result = DatabaseManager.execute_query(
                Queries.UPSERT_SUBSCRIPTION,
                (user_id, today, days)
            )
            return result is not None
            
        except Exception as e:
            logger.error(f"Errore gestione abbonamento: {e}")
            return False

# API Routes
@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        
        # Validazione input
        required_fields = ['first_name', 'last_name', 'email', 'birthdate', 'password']
        missing_fields = Validator.validate_required_fields(data, required_fields)
        
        if missing_fields:
            return jsonify({
                "success": False, 
                "message": f"Campi obbligatori mancanti: {', '.join(missing_fields)}"
            }), 400
        
        # Validazione email
        if not Validator.validate_email(data['email']):
            return jsonify({
                "success": False, 
                "message": "Email non valida"
            }), 400
        
        # Validazione password
        if not Validator.validate_password(data['password']):
            return jsonify({
                "success": False, 
                "message": "Password deve essere di almeno 6 caratteri"
            }), 400
        
        # Validazione data
        if not Validator.validate_date(data['birthdate']):
            return jsonify({
                "success": False, 
                "message": "Data di nascita non valida"
            }), 400
        
        # Verifica email esistente
        if UserService.email_exists(data['email']):
            return jsonify({
                "success": False, 
                "message": "Email già registrata"
            }), 409
        
        # Creazione utente
        if UserService.create_user(
            data['first_name'], data['last_name'], 
            data['email'], data['birthdate'], data['password']
        ):
            return jsonify({
                "success": True, 
                "message": "Registrazione completata con successo"
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Errore durante la registrazione"
            }), 500
            
    except Exception as e:
        logger.error(f"Errore API register: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({
                "success": False, 
                "message": "Email e password obbligatori"
            }), 400
        
        user = UserService.authenticate_user(data['email'], data['password'])
        
        if user:
            return jsonify({
                "success": True,
                "userFullName": f"{user['first_name']} {user['last_name']}",
                "userEmail": user['email'],
                "userId": user['id']
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Credenziali non valide"
            }), 401
            
    except Exception as e:
        logger.error(f"Errore API login: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/retrieveCourse", methods=["POST"])
def retrieve_course():
    try:
        data = request.get_json()
        
        if not data.get('userId') or not data.get('reservation_date'):
            return jsonify({
                "success": False, 
                "message": "Parametri mancanti"
            }), 400
        
        if not Validator.validate_date(data['reservation_date']):
            return jsonify({
                "success": False, 
                "message": "Data non valida"
            }), 400
        
        courses = CourseService.get_available_courses(
            data['userId'], 
            data['reservation_date']
        )
        
        if courses is not None:
            return jsonify({
                "success": True, 
                "courselist": [list(course.values()) if hasattr(course, 'values') else course for course in courses]
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Errore recupero corsi"
            }), 500
            
    except Exception as e:
        logger.error(f"Errore API retrieveCourse: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/confirmedReservation", methods=["POST"])
def confirmed_reservation():
    try:
        data = request.get_json()
        
        required_fields = ['userId', 'courseId', 'reservationDate']
        missing_fields = Validator.validate_required_fields(data, required_fields)
        
        if missing_fields:
            return jsonify({
                "success": False, 
                "message": f"Parametri mancanti: {', '.join(missing_fields)}"
            }), 400
        
        success, message = ReservationService.create_reservation(
            data['userId'], 
            data['courseId'], 
            data['reservationDate']
        )
        
        return jsonify({
            "success": success, 
            "message": message
        }), 200 if success else 400
        
    except Exception as e:
        logger.error(f"Errore API confirmedReservation: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/deleteReservation", methods=["POST"])
def delete_reservation():
    try:
        data = request.get_json()
        
        if not data.get('reservationId') or not data.get('userId'):
            return jsonify({
                "success": False, 
                "message": "Parametri mancanti"
            }), 400
        
        success = ReservationService.cancel_reservation(
            data['reservationId'], 
            data['userId']
        )
        
        return jsonify({
            "success": success,
            "message": "Prenotazione cancellata" if success else "Impossibile cancellare la prenotazione"
        })
        
    except Exception as e:
        logger.error(f"Errore API deleteReservation: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/retrieveReservation", methods=["POST"])
def retrieve_reservation():
    try:
        data = request.get_json()
        
        if not data.get('userId'):
            return jsonify({
                "success": False, 
                "message": "UserId obbligatorio"
            }), 400
        
        reservations = ReservationService.get_user_reservations(data['userId'])
        
        if reservations is not None:
            return jsonify({
                "success": True, 
                "reservationlist": [list(res.values()) if hasattr(res, 'values') else res for res in reservations]
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Errore recupero prenotazioni"
            }), 500
            
    except Exception as e:
        logger.error(f"Errore API retrieveReservation: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/retrieveSubscription", methods=["POST"])
def retrieve_subscription():
    try:
        data = request.get_json()
        
        if not data.get('userId'):
            return jsonify({
                "success": False, 
                "message": "UserId obbligatorio"
            }), 400
        
        subscription = SubscriptionService.get_user_subscription(data['userId'])
        
        if subscription:
            return jsonify({
                "success": True, 
                "subscriptionList": [list(subscription.values()) if hasattr(subscription, 'values') else subscription]
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Nessun abbonamento trovato"
            }), 404
            
    except Exception as e:
        logger.error(f"Errore API retrieveSubscription: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/buySubscription", methods=["POST"])
def buy_subscription():
    try:
        data = request.get_json()
        
        if not data.get('userId') or not data.get('subscription'):
            return jsonify({
                "success": False, 
                "message": "Parametri mancanti"
            }), 400
        
        try:
            days = int(data['subscription'])
            if days <= 0:
                raise ValueError("Giorni devono essere positivi")
        except (ValueError, TypeError):
            return jsonify({
                "success": False, 
                "message": "Numero giorni non valido"
            }), 400
        
        success = SubscriptionService.create_or_extend_subscription(
            data['userId'], 
            days
        )
        
        return jsonify({
            "success": success,
            "message": "Abbonamento acquistato con successo" if success else "Errore acquisto abbonamento"
        })
        
    except Exception as e:
        logger.error(f"Errore API buySubscription: {e}")
        return jsonify({
            "success": False, 
            "message": "Errore del server"
        }), 500

@app.route("/")
def home():
    return render_template("indexNew.html")

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "message": "Endpoint non trovato"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Errore interno del server: {error}")
    return jsonify({"success": False, "message": "Errore interno del server"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
