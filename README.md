# Projet de test Docker API

Ce projet est un exemple simple avec trois parties :

- un frontend statique servi par Nginx ;
- un backend Node.js avec Express ;
- une base de données MySQL.

Le frontend envoie un formulaire au backend, puis le backend enregistre les données dans MySQL.

## Structure du projet

```text
test-docker-api/
|-- backend/
|   |-- Dockerfile
|   |-- package.json
|   `-- server.js
`-- frontend/
    `-- index.html
```

## Prérequis

Avant de commencer, il faut avoir :

- Docker Desktop installé et démarré ;
- PowerShell ouvert dans le dossier racine du projet ;
- le dossier du projet positionné sur `test-docker-api`.

## Étapes de création du projet

### 1. Créer le réseau Docker

```powershell
docker network create app-network
```

Ce réseau permet aux conteneurs `frontend`, `backend` et `database` de communiquer entre eux.

### 2. Créer le volume Docker pour MySQL

```powershell
docker volume create mysql_api_data
```

Ce volume permet de conserver les données MySQL même si le conteneur est supprimé.

### 3. Télécharger l'image MySQL

```powershell
docker pull mysql:8.0
```

### 4. Lancer le conteneur de base de données

```powershell
docker run -d --name database-container --network app-network -e MYSQL_ROOT_PASSWORD=root123 -e MYSQL_DATABASE=formulaire_db -v mysql_api_data:/var/lib/mysql -p 3308:3306 mysql:8.0
```

Explication :

- `database-container` est le nom du conteneur MySQL ;
- `app-network` est le réseau partagé ;
- `MYSQL_ROOT_PASSWORD=root123` définit le mot de passe root ;
- `MYSQL_DATABASE=formulaire_db` crée la base de données au démarrage ;
- `mysql_api_data:/var/lib/mysql` monte le volume de persistance ;
- `3308:3306` expose MySQL sur le port `3308` côté machine locale.

### 5. Construire l'image du backend

Depuis la racine du projet :

```powershell
docker build -t backend-api ./backend
```

Cette commande utilise le `Dockerfile` présent dans le dossier `backend/`.

### 6. Lancer le conteneur du backend

```powershell
docker run -d --name backend-container --network app-network -p 5000:5000 backend-api
```

Le backend écoute sur le port `5000`.

Note importante :
Au premier démarrage, MySQL peut mettre quelques secondes à devenir prêt. C'est normal si le backend affiche temporairement un message de reconnexion dans les logs.

### 7. Télécharger l'image Nginx

```powershell
docker pull nginx:alpine
```

### 8. Lancer le conteneur du frontend

Depuis la racine du projet, sous PowerShell Windows :

```powershell
docker run -d --name frontend-container --network app-network -p 8080:80 -v "${PWD}\frontend:/usr/share/nginx/html:ro" nginx:alpine
```

Explication :

- le frontend statique est monté dans `/usr/share/nginx/html` ;
- `:ro` signifie lecture seule ;
- `8080:80` publie le site sur `http://localhost:8080`.

## Vérification

Après le lancement des trois conteneurs :

- frontend : `http://localhost:8080`
- backend : `http://localhost:5000`
- base de données locale : port `3308`

Quand vous ouvrez le frontend dans le navigateur :

- vous pouvez envoyer un nom et un email ;
- le backend reçoit la requête ;
- le backend enregistre les données dans MySQL ;
- la liste des contacts s'affiche ensuite dans la page.

## Logs des conteneurs

### Logs du backend

```powershell
docker logs backend-container
```

### Logs de la base de données

```powershell
docker logs database-container
```

### Logs du frontend

```powershell
docker logs frontend-container
```

## Résumé

L'ordre conseillé est le suivant :

1. créer le réseau ;
2. créer le volume ;
3. lancer MySQL ;
4. construire l'image du backend ;
5. lancer le backend ;
6. lancer le frontend.

Avec cette procédure, le projet fonctionne comme une petite application complète : frontend + backend + base de données.
