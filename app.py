import os
from flask import Flask, render_template
import psycopg2

app = Flask(__name__, static_folder='static')

# Configurazione del database
DB_CONFIG = {
    'dbname': 'fitbook-reservation',
    'user': 'fitbook_reservation_user',
    'password': 'W858EmxOR0Hp34YiTAW5HLpaQNoK5qW9',
    'host': 'dpg-cu3s0ptds78s73ehhd8g-a',
    'port': 5432  # Default PostgreSQL port
}

def get_users():
    """Recupera i dati dalla tabella user."""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, cognome, email, data_di_nascita FROM users;")
    rows = cursor.fetchall()  # Recupera tutti i record
    conn.close()
    console.log(rows)
    return rows

@app.route('/')
def home():
    users = get_users()
    return render_template('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Usa la porta specificata da Render o 5000 in locale
    app.run(host='0.0.0.0', port=port, debug=True)
