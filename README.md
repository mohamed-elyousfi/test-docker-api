# Projet Docker manuel : frontend + backend + base de donnees

Ce README decrit la methode manuelle utilisee pour construire le projet, sans `docker-compose.yml`.

Le projet contient 3 conteneurs :

- `database-container` pour MySQL
- `backend-container` pour l'API Node.js + Express
- `frontend-container` pour le frontend statique servi par Nginx

Les trois conteneurs communiquent via un meme reseau Docker.

## Ce que fait le projet

Flux :

```text
Browser -> frontend-container -> backend-container -> database-container
```

Le frontend envoie les donnees du formulaire au backend.
Le backend recoit ces donnees puis les enregistre dans MySQL.

## 1. Creer les dossiers du projet

Structure finale :

```text
test-docker-api/
|-- backend/
|   |-- Dockerfile
|   |-- package.json
|   `-- server.js
`-- frontend/
    `-- index.html
```

Exemple en ligne de commande :

```bash
mkdir test-docker-api
cd test-docker-api
mkdir backend
mkdir frontend
```

## 2. Creer le reseau Docker

```bash
docker network create app-network
docker network ls
```

Ce reseau permet aux 3 conteneurs de communiquer.

## 3. Creer le volume Docker pour MySQL

```bash
docker volume create mysql_api_data
docker volume ls
```

Ce volume permet de conserver les donnees de la base.

## 4. Creer les fichiers du backend

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

Ligne importante :

```js
host: "database-container"
```

Ce nom correspond au conteneur MySQL dans le reseau Docker.

## 5. Creer le fichier du frontend

### `frontend/index.html`

Creez le fichier `frontend/index.html` puis ajoutez :

```html
<!DOCTYPE html>
<html lang="fr">
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

## 6. Telecharger l'image MySQL

```bash
docker pull mysql:8.0
```

## 7. Lancer le conteneur de base de donnees

```bash
docker run -d --name database-container --network app-network -e MYSQL_ROOT_PASSWORD=root123 -e MYSQL_DATABASE=formulaire_db -v mysql_api_data:/var/lib/mysql -p 3308:3306 mysql:8.0
```

Explication :

- `--name database-container` : nom du conteneur MySQL
- `--network app-network` : rattache le conteneur au reseau
- `MYSQL_ROOT_PASSWORD=root123` : mot de passe root
- `MYSQL_DATABASE=formulaire_db` : creation de la base
- `-v mysql_api_data:/var/lib/mysql` : persistance des donnees
- `-p 3308:3306` : publication du port MySQL

## 8. Construire l'image du backend

Depuis la racine du projet :

```bash
docker build -t backend-api ./backend
```

Cette commande cree une image personnalisee nommee `backend-api`.

## 9. Lancer le conteneur du backend

```bash
docker run -d --name backend-container --network app-network -p 5000:5000 backend-api
```

Le backend se connecte a MySQL grace au nom :

```text
database-container
```

car les deux conteneurs sont sur `app-network`.

## 10. Telecharger l'image Nginx

```bash
docker pull nginx:alpine
```

## 11. Lancer le conteneur du frontend

Depuis la racine du projet :

Sous Windows CMD :

```bash
docker run -d --name frontend-container --network app-network -p 8080:80 -v "%cd%\frontend:/usr/share/nginx/html:ro" nginx:alpine
```

Sous PowerShell :

```bash
docker run -d --name frontend-container --network app-network -p 8080:80 -v "${PWD}\frontend:/usr/share/nginx/html:ro" nginx:alpine
```

Cette commande sert `frontend/index.html` avec Nginx.

## 12. Verifier les conteneurs en cours d'execution

```bash
docker ps
```

Vous devez voir :

- `database-container`
- `backend-container`
- `frontend-container`

## 13. Tester le backend directement

Ouvrez :

```text
http://localhost:5000
```

Vous devez voir :

```text
API is running
```

Puis ouvrez :

```text
http://localhost:5000/contacts
```

Au debut, le resultat peut etre :

```json
[]
```

ou une liste de contacts deja enregistres.

## 14. Tester le frontend

Ouvrez :

```text
http://localhost:8080
```

Vous verrez le formulaire.

Entrez :

- un nom
- un email

Puis cliquez sur envoyer.

Ce qui se passe :

- le frontend envoie une requete `POST` au backend
- le backend insere les donnees dans MySQL
- le frontend recharge la liste des contacts

Cela confirme la communication entre les 3 conteneurs.

## 15. Consulter les logs

### Logs du backend

```bash
docker logs backend-container
```

### Logs de la base de donnees

```bash
docker logs database-container
```

### Logs du frontend

```bash
docker logs frontend-container
```

## 16. Commandes utiles

### Arreter tous les conteneurs

```bash
docker stop frontend-container backend-container database-container
```

### Redemarrer tous les conteneurs

```bash
docker start database-container backend-container frontend-container
```

### Supprimer tous les conteneurs

```bash
docker rm -f frontend-container backend-container database-container
```

## 17. Sequence complete des commandes

Depuis la racine du projet :

```bash
docker network create app-network
docker volume create mysql_api_data
docker pull mysql:8.0
docker run -d --name database-container --network app-network -e MYSQL_ROOT_PASSWORD=root123 -e MYSQL_DATABASE=formulaire_db -v mysql_api_data:/var/lib/mysql -p 3308:3306 mysql:8.0
docker build -t backend-api ./backend
docker run -d --name backend-container --network app-network -p 5000:5000 backend-api
docker pull nginx:alpine
docker run -d --name frontend-container --network app-network -p 8080:80 -v "%cd%\frontend:/usr/share/nginx/html:ro" nginx:alpine
docker ps
```

## 18. Logique de communication

- `frontend-container` est accessible dans le navigateur via le port `8080`
- le JavaScript du frontend envoie les requetes vers `localhost:5000`
- `backend-container` ecoute sur le port `5000`
- le backend utilise `database-container` comme hote MySQL
- `database-container` stocke les donnees dans MySQL

## 19. Detail important

Le navigateur ne peut pas utiliser directement les noms des conteneurs Docker.

Dans le frontend, on utilise donc :

```js
http://localhost:5000/contacts
```

car le navigateur tourne en dehors de Docker.

Dans le backend, on utilise :

```js
host: "database-container"
```

car la communication entre conteneurs passe par le reseau Docker.
