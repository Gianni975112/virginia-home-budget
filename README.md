# Virginia Home Budget 🏡

App per la gestione delle spese familiari di Gianni, Claudia e Virginia.
Costruita con **React + Vite + Supabase**.

## Setup rapido

### 1 — Supabase SQL Editor
Apri `supabase/database.sql`, sostituisci le due email demo con le email reali, incolla ed esegui.

### 2 — .env.local
```
VITE_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
VITE_SUPABASE_ANON_KEY=LA_TUA_ANON_KEY
```

### 3 — Auth URL Configuration (in Supabase)
- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/**`

### 4 — Avvio
```bash
npm install
npm run dev
```

### 5 — Primo accesso
Gianni accede con la sua email → clicca "Attiva accesso".
Claudia fa lo stesso. Da quel momento i dati sono condivisi in realtime.

## Deploy Vercel
```bash
npm run build
```
Aggiungi le stesse env vars in Vercel e il dominio nelle Redirect URLs di Supabase.
