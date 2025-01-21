import os
from flask import Flask, render_template

app = Flask(__name__, static_folder='static')

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Usa la porta specificata da Render o 5000 in locale
    app.run(host='0.0.0.0', port=port, debug=True)
