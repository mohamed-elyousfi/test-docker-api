# Creation des fichiers du projet

Ce README montre uniquement les etapes utilisees pour creer la structure du projet ainsi que les fichiers du backend et du frontend.

Il ne detaille pas ici toutes les commandes Docker de lancement des conteneurs.

## Structure finale

```text
test-docker-api/
|-- backend/
|   |-- Dockerfile
|   |-- package.json
|   `-- server.js
`-- frontend/
    `-- index.html
```

## 1. Creer les dossiers du projet

Vous pouvez creer le projet manuellement ou avec des commandes.

Exemple en ligne de commande :

```bash
mkdir test-docker-api
cd test-docker-api
mkdir backend
mkdir frontend
```

## 2. Creer les fichiers du backend

### `backend/Dockerfile`

Creez le fichier `backend/Dockerfile` puis ajoutez :

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY server.js .

EXPOSE 5000

CMD ["npm", "start"]
```

### `backend/package.json`

Creez le fichier `backend/package.json` puis ajoutez :

```json
{
  "name": "backend-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "mysql2": "^3.14.1"
  }
}
```

### `backend/server.js`

Creez le fichier `backend/server.js` puis ajoutez :

```js
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "database-container",
  user: "root",
  password: "root123",
  database: "formulaire_db"
});

function connectWithRetry() {
  db.connect((err) => {
    if (err) {
      console.log("MySQL not ready, retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
      return;
    }

    console.log("Connected to MySQL");

    const sql = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL
      )
    `;

    db.query(sql, (err) => {
      if (err) {
        console.error("Table creation error:", err.message);
      } else {
        console.log("Table contacts ready");
      }
    });
  });
}

connectWithRetry();

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/contacts", (req, res) => {
  db.query("SELECT * FROM contacts ORDER BY id DESC", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.post("/contacts", (req, res) => {
  const { nom, email } = req.body;

  if (!nom || !email) {
    return res.status(400).json({ message: "nom and email are required" });
  }

  const sql = "INSERT INTO contacts (nom, email) VALUES (?, ?)";
  db.query(sql, [nom, email], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      message: "Contact added successfully",
      id: result.insertId
    });
  });
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});
```

Point important :

```js
host: "database-container"
```

Cette valeur correspond au nom du conteneur MySQL utilise plus tard dans le reseau Docker.

## 3. Creer le fichier du frontend

### `frontend/index.html`

Creez le fichier `frontend/index.html` puis ajoutez :

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Formulaire API</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 700px;
      margin: 40px auto;
      padding: 20px;
    }
    form {
      margin-bottom: 20px;
    }
    input, button {
      display: block;
      margin: 10px 0;
      padding: 10px;
      width: 100%;
    }
    li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <h1>Formulaire</h1>

  <form id="contactForm">
    <input type="text" id="nom" placeholder="Nom" required />
    <input type="email" id="email" placeholder="Email" required />
    <button type="submit">Envoyer</button>
  </form>

  <h2>Contacts enregistres</h2>
  <ul id="contactList"></ul>

  <script>
    const form = document.getElementById("contactForm");
    const list = document.getElementById("contactList");

    async function loadContacts() {
      const res = await fetch("http://localhost:5000/contacts");
      const data = await res.json();

      list.innerHTML = "";
      data.forEach(contact => {
        const li = document.createElement("li");
        li.textContent = `${contact.nom} - ${contact.email}`;
        list.appendChild(li);
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nom = document.getElementById("nom").value;
      const email = document.getElementById("email").value;

      const res = await fetch("http://localhost:5000/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nom, email })
      });

      const data = await res.json();
      alert(data.message || "Done");

      form.reset();
      loadContacts();
    });

    loadContacts();
  </script>
</body>
</html>
```

## 4. Logique entre frontend et backend

Le navigateur charge le frontend depuis `frontend/index.html`.

Le JavaScript du frontend envoie ensuite les requetes vers :

```text
http://localhost:5000/contacts
```

Cela permet d'envoyer les donnees du formulaire au backend.

## Resume

Pour construire les fichiers du projet, il faut simplement :

1. creer le dossier `backend/` ;
2. creer le dossier `frontend/` ;
3. ajouter `backend/Dockerfile` ;
4. ajouter `backend/package.json` ;
5. ajouter `backend/server.js` ;
6. ajouter `frontend/index.html`.

Une fois ces fichiers crees, le projet est pret pour les etapes Docker de build et d'execution.
