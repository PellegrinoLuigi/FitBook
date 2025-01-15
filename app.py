# Prende i dati da un file (simulando una richiesta POST)

# Supponiamo che i dati vengano inviati come testo tramite un modulo
name = input("Inserisci il nome: ")
date = input("Inserisci la data della prenotazione: ")

# Salviamo i dati su un file di testo
with open("prenotazioni.txt", "a") as f:
    f.write(f"Prenotazione: {name} - {date}\n")

print("Prenotazione ricevuta!")
