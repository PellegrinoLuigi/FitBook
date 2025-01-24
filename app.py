import os
from flask import Flask, render_template
import psycopg2

app = Flask(__name__, static_folder='static')
# Configurazione del database tramite variabili d'ambiente
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT', 5432)  # Porta di default

# Costruisci la stringa di connessione
conn_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}"

def get_users():
    """Recupera i dati dalla tabella user."""
    try:
        # Connessione al database
        conn = psycopg2.connect(conn_string)  # Usa la stringa di connessione
        cursor = conn.cursor()
        
        # Esegui la query
        cursor.execute("SELECT id, nome, cognome, email, data_di_nascita FROM users;")
        rows = cursor.fetchall()  # Recupera tutti i record
        conn.close()
        
        return rows
    except Exception as e:
        # Stampa l'errore a schermo
        print(f"Errore durante la connessione al database o l'esecuzione della query: {e}")
        return []

@app.route('/')
def home():
    users = get_users()
    utente='cavolo'
    return render_template('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Usa la porta specificata da Render o 5000 in locale
    app.run(host='0.0.0.0', port=port, debug=True)
