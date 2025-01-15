import os
port = int(os.environ.get("PORT", 5000))  # Usa 5000 come fallback
app.run(host="0.0.0.0", port=port)
# Dati predefiniti (senza input o file)
name = "Luigi"
date = "2025-01-20"

# Mostra il risultato direttamente nel terminale
print(f"Prenotazione ricevuta per {name} il {date}!")
