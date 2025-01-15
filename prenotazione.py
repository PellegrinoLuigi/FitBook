# Leggi i dati da un file di testo (simulando una richiesta)
with open("dati_prenotazione.txt", "r") as f:
    lines = f.readlines()

# Supponiamo che il file contenga dati nel formato:
# Nome
# Data
name = lines[0].strip()  # Primo dato è il nome
date = lines[1].strip()  # Secondo dato è la data

# Salviamo i dati su un file di prenotazione
with open("prenotazioni.txt", "a") as f:
    f.write(f"Prenotazione: {name} - {date}\n")

print(f"Prenotazione ricevuta per {name} il {date}!")
