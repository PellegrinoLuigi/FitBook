from flask import Flask
import os

# Crea l'istanza dell'app Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return "Ciao, mondo!"

if __name__ == "__main__":
    # Recupera la porta dalla variabile d'ambiente PORT
    port = int(os.environ.get("PORT", 5000))  # 5000 è il valore di default
    # Avvia il server Flask
    app.run(host="0.0.0.0", port=port)
