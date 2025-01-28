import os
from flask import Flask, render_template, request, jsonify
import psycopg2

app = Flask(__name__, static_folder='static')
# Configurazione del database tramite variabili d'ambiente
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT', 5432)  # Porta di default

QUERY_ALL_USER="SELECT id, nome, cognome, email, data_di_nascita FROM users;"
QUERY_LOGGED_USER="SELECT * FROM users WHERE email = %s AND password = %s;"
QUERY_EMAIL_FILTERED_USER="SELECT * FROM users WHERE email = %s;"

# Costruisci la stringa di connessione
conn_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}"
def get_db_connection():
    """Restituisce una connessione al database"""
    try:
        conn = psycopg2.connect(conn_string)
        return conn
    except Exception as e:
        print(f"Errore durante la connessione al database: {e}")
        return None

def verifica_email(email):
    """Funzione per verificare se l'email esiste già nel DB"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(QUERY_EMAIL_FILTERED_USER, (email,))
        user = cursor.fetchone()
        conn.close()

        return user is not None
    except Exception as e:
        print(f"Errore nel connettersi al DB: {e}")
        return False

def registra_utente(nome, cognome, email, data_nascita, password):
    """Funzione per registrare un nuovo utente nel DB"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (nome, cognome, email, data_di_nascita, password) VALUES (%s, %s, %s, %s, %s)",
                       (nome, cognome, email, data_nascita, password))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Errore nel registrare l'utente: {e}")
        return False


@app.route('/register', methods=['POST'])
def registrazione():
    data = request.get_json()
    nome = data.get('nome')
    cognome = data.get('cognome')
    email = data.get('email')
    data_nascita = data.get('data_nascita')
    password = data.get('password')

    if verifica_email(email):
        return jsonify({"success": False, "message": "L'email è già registrata."})
    
    if registra_utente(nome, cognome, email, data_nascita, password):
    #if registra_utente('Mario', 'Rossi', 'mario.rossi@example.com', '1990-05-20', 'hashed_password'):
        return jsonify({"success": True, "message": "Registrazione avvenuta con successo!"})
    else:
        return jsonify({"success": False, "message": "Errore durante la registrazione."})


def get_users():
    """Recupera i dati dalla tabella user."""
    try:
        # Connessione al database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Esegui la query
        cursor.execute(QUERY_ALL_USER)
        rows = cursor.fetchall()  # Recupera tutti i record
        conn.close()
        
        return rows
    except Exception as e:
        # Stampa l'errore a schermo
        print(f"Errore durante la connessione al database o l'esecuzione della query: {e}")
        return []

def login_user(email, password):
    """Funzione per verificare se l'utente esiste nel DB"""
    try:
        # Connessione al database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Query per verificare l'utente
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

    #if login_user(email, password):
    if db_request_select(QUERY_LOGGED_USER,email, password):
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Credenziali errate."})
        
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

@app.route('/')
def home():
    users = get_users()
    utente='cavolo'
    return render_template('index.html',utente=utente, users=users)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Usa la porta specificata da Render o 5000 in locale
    app.run(host='0.0.0.0', port=port, debug=True)
