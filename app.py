from flask import Flask, render_template, request, redirect, url_for
import psycopg2
import os
from urllib.parse import quote as url_quote

app = Flask(__name__)

# Connessione al database PostgreSQL
def get_db_connection():
    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST"),
        database=os.environ.get("DB_NAME"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD")
    )
    return conn

# Home page che mostra il form per la prenotazione
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint per inviare la prenotazione
@app.route('/book', methods=['POST'])
def book():
    name = request.form['name']
    date = request.form['date']
    time = request.form['time']

    # Aggiungi la prenotazione nel database
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('INSERT INTO reservations (name, date, time) VALUES (%s, %s, %s)', (name, date, time))
    conn.commit()
    cur.close()
    conn.close()

    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
