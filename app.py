from flask import Flask, request, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    name = request.form.get('name')
    date = request.form.get('date')
    print(f'Prenotazione ricevuta: {name} per il giorno {date}')
    return f'Prenotazione ricevuta per {name} il {date}. Grazie!'

if __name__ == '__main__':
    app.run(debug=True)
