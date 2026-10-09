# LudiGest — Fonctionnalités

Application de gestion de ludothèque pour la BRED. Disponible en version **web** (Next.js) et **mobile** (Android via Expo).

---

## Table des matières

1. [Authentification & Comptes](#1-authentification--comptes)
2. [Catalogue de jeux](#2-catalogue-de-jeux)
3. [Emprunts](#3-emprunts)
4. [Notation & Avis](#4-notation--avis)
5. [Scanner code-barres](#5-scanner-code-barres)
6. [Espace Admin — Tableau de bord](#6-espace-admin--tableau-de-bord)
7. [Espace Admin — Gestion des jeux](#7-espace-admin--gestion-des-jeux)
8. [Espace Admin — Gestion des emprunts](#8-espace-admin--gestion-des-emprunts)
9. [Espace Admin — Gestion des utilisateurs](#9-espace-admin--gestion-des-utilisateurs)
10. [Espace Admin — Paramètres email](#10-espace-admin--paramètres-email)
11. [Application mobile](#11-application-mobile)
12. [Pages d'information](#12-pages-dinformation)
13. [Futurs achats](#13-futurs-achats)

---

## 1. Authentification & Comptes

| Fonctionnalité | Web | Mobile |
|---|:---:|:---:|
| Connexion email + mot de passe | ✅ | ✅ |
| Inscription (prénom, nom, email BRED, matricule, lieu, mot de passe) | ✅ | ✅ |
| Vérification de l'email obligatoire avant connexion | ✅ | ✅ |
| Renvoi de l'email de vérification | ✅ | ✅ |
| Changement de ludothèque (lieu) depuis le compte | ✅ | ✅ |
| Déconnexion | ✅ | ✅ |
| Authentification mobile via token JWT (Bearer) | — | ✅ |
| Connexion mobile conservée 90 jours et renouvelée automatiquement à chaque ouverture de l'appli | — | ✅ |
| Retour à l'écran de connexion si la session n'est plus valable (au lieu d'écrans vides) | — | ✅ |

---

## 2. Catalogue de jeux

Accessible depuis `/games` (web) et l'onglet **Liste des jeux** (mobile).

**Recherche & Filtres**
- Recherche textuelle par nom de jeu
- Filtre par statut : Tous / Disponible / Emprunté
- Filtre par catégorie : Famille, Initié, Expert, Enfant, Ambiance, Escape
- Filtre par note minimale (1 à 5 étoiles) *(web uniquement)*
- Filtre par durée maximale *(web uniquement)*
- Filtre par nombre de joueurs *(web uniquement)*
- Filtre par date d'entrée dans la collection *(web uniquement)*

**Tri**
- Nom A → Z / Z → A
- Mieux notés
- Durée croissante
- Plus récents

**Affichage**
- Vue grille / vue liste *(web)*
- Grille 2 colonnes *(mobile)*
- Bannière du lieu sélectionné
- Chaque jeu affiche : photo de couverture, nom, catégorie, statut, note moyenne

**Fiche jeu détaillée**
- Photo de couverture
- Catégorie, type, statut de disponibilité
- Nombre de joueurs (min/max), durée, âge minimum
- Résumé / description
- Note moyenne + nombre d'avis
- Liste des avis avec étoiles et commentaires
- Bouton Emprunter (si disponible)
- Avis actif de l'utilisateur connecté (ajouter / modifier)
- *(Admin)* Historique complet des emprunts du jeu (modal)

---

## 3. Emprunts

**Règles**
- Durée d'emprunt : 4 semaines
- Maximum 5 emprunts simultanés par utilisateur
- Prolongation possible jusqu'à 3 fois (+1 semaine par prolongation)

**Page "Mes emprunts"**
- Compteur d'emprunts actifs (X/5)
- Statut visuel par emprunt :
  - 🔴 En retard
  - 🟡 Bientôt dû (< 7 jours)
  - ⚪ Normal
- Bouton **Rendre** avec confirmation (rappel de rangement)
- Bouton **Prolonger** (désactivé si 3 prolongations atteintes)
- Historique des emprunts passés (section dépliable)

---

## 4. Notation & Avis

- Note de 1 à 5 étoiles par jeu
- Commentaire texte facultatif
- Un avis par utilisateur par jeu (modifiable)
- Note moyenne calculée et affichée sur chaque carte jeu

---

## 5. Scanner code-barres

| Fonctionnalité | Web | Mobile |
|---|:---:|:---:|
| Scan via caméra | ✅ | ✅ |
| Formats supportés : EAN-13, EAN-8, UPC-A, UPC-E, QR code | ✅ | ✅ |
| Emprunt automatique après scan | ✅ | ✅ |
| Alerte avec nom du jeu et date limite | ✅ | ✅ |
| Lien vers la fiche du jeu après scan | ✅ | ✅ |

---

## 6. Espace Admin — Tableau de bord

Accessible depuis `/admin`.

**Indicateurs globaux**
- Nombre total de jeux / disponibles
- Emprunts en cours
- Emprunts en retard

**Par ludothèque**
- Jeux disponibles vs total
- Emprunts actifs
- Emprunts en retard

**Statistiques avancées** *(section dépliable)*
- Total des emprunts depuis l'ouverture
- Emprunts sur les 30 derniers jours
- Durée moyenne d'emprunt
- Nombre de retours en retard
- Top 5 des jeux les plus empruntés (avec graphique en barres)
- Répartition des jeux par catégorie

---

## 7. Espace Admin — Gestion des jeux

Accessible depuis `/admin/games`.

**Liste des jeux**
- Recherche par nom
- Filtres : statut, catégorie
- Tri : A→Z, Z→A, plus récents
- Indicateurs : jeux non enrichis (sans photo BGG), jeux sans code-barres
- Actions par jeu :
  - Modifier (modal complet)
  - Enrichir via BoardGameGeek (photo, résumé, joueurs, durée, âge)
  - Suspendre / Réactiver
  - Supprimer
  - **Mettre en emprunt** au nom d'un membre (jeux disponibles uniquement)

**Mettre en emprunt** *(modal)*
- Choix du membre dans la liste (filtre par nom ou email, comptes suspendus exclus)
- Choix de la date d'emprunt : aujourd'hui ou une date antérieure
- Date de retour calculée à 4 semaines après la date choisie
- La limite de 5 emprunts simultanés ne s'applique pas à cette action
- Email dédié envoyé au membre : un administrateur lui a attribué l'emprunt du jeu, avec la date d'emprunt et la date de retour
- Envoi tracé dans le journal des emails

**Ajout rapide d'un jeu** *(modal)*
- Nom + catégorie + ID BGG optionnel
- Récupération automatique des données BoardGameGeek

**Éditeur complet** *(modal)*
- Nom, catégorie, type, date d'entrée
- Joueurs (min/max), durée, âge minimum
- Résumé, URL de couverture, ID BoardGameGeek
- Code-barres avec bouton scanner

**Import Excel** (`/admin/import`)
- Upload d'un fichier `.xlsx`
- Colonnes attendues : Nom du jeu, Catégorie, Date d'entrée (facultatif)
- Formats de date acceptés : JJ/MM/AAAA ou AAAA-MM-JJ
- Enrichissement automatique via BGG après import
- Résultat détaillé : créés / ignorés / erreurs

---

## 8. Espace Admin — Gestion des emprunts

Accessible depuis `/admin/loans`.

**Tableau des emprunts**
- Filtre : emprunts actifs uniquement
- Filtre : emprunts en retard uniquement
- Recherche par nom ou email utilisateur
- Tri par : utilisateur, jeu, date d'emprunt, date limite, date de retour
- Indicateurs visuels : retard actuel (rouge), retour tardif (icône rouge)

**Actions par emprunt**
- Envoyer un email de rappel (bleu = à venir, rouge = en retard)
- Forcer le retour (marquer comme rendu sans action utilisateur)

**Suivi des rappels**
- Historique de tous les emails envoyés par emprunt (type, date), y compris l'email « emprunt attribué par un admin »
- Affiché en tooltip / popover

> Un emprunt peut aussi être créé par un admin au nom d'un membre depuis la gestion des jeux (voir section 7).

---

## 9. Espace Admin — Gestion des utilisateurs

Accessible depuis `/admin/users`.

**Tableau des utilisateurs**
- Recherche par nom ou email
- Tri par : nom, lieu, emprunts totaux, emprunts actifs, retards, statut
- Informations : nom, email, matricule, lieu, date d'inscription
- Statistiques par utilisateur : emprunts totaux, actifs, retards

**Actions par utilisateur**
- Voir l'historique des emprunts (modal)
- Promouvoir / Rétrograder (rôle Admin ↔ Utilisateur)
- Vérifier l'email manuellement (bypass de la vérification)
- Suspendre / Réactiver le compte

**Export**
- Export de la liste complète en fichier Excel (`.xlsx`)

---

## 10. Espace Admin — Paramètres email

Accessible depuis `/admin/email-settings`.

**Configuration des rappels automatiques**
- Nombre de jours avant la date limite pour envoyer le rappel (1–14 jours)
- Fréquence des relances pour retard (1–30 jours)

**Templates personnalisables**
- Objet et corps de l'email de rappel
- Objet et corps de l'email de retard
- Variables disponibles dans les templates : `{{userName}}`, `{{gameName}}`, `{{dueAt}}`

---

## 11. Application mobile

Toutes les fonctionnalités utilisateur sont disponibles. Les fonctions admin ouvrent l'interface web dans le navigateur.

**Onglets**
| Onglet | Accès |
|---|---|
| 🎲 Liste des jeux | Tous |
| 📷 Emprunter un jeu (scanner) | Tous |
| 📚 Mes emprunts | Tous |
| 🛒 Achats (futurs achats) | Tous pendant la période d'ouverture — Admin en permanence |
| ⚙️ Admin | Admin uniquement |

**Spécificités mobile**
- Token JWT stocké de façon sécurisée (Expo SecureStore)
- Changement de ludothèque depuis "Mon compte" → liste mise à jour en temps réel
- Pull-to-refresh sur les listes
- Scanner natif (caméra Android)
- Lien vers "Comment ça marche" (ouvre le navigateur)
- Accueil : emprunts, prochaine session et suggestions chargés indépendamment (un appel en échec ne vide plus tout l'écran)

**Mise à jour de l'application**
- L'application est distribuée en APK depuis la page `/download` du site (pas de Play Store)
- Bandeau « Nouvelle version disponible (v…) » sur l'accueil dès qu'un APK plus récent est publié ; un appui ouvre la page de téléchargement
- Section « Version de l'application » dans "Mon compte" : version installée, dernière version disponible, bouton de téléchargement, « Vérifier à nouveau »
- La version publiée est lue dans le fichier `app-version.json` du site, mis à jour à chaque nouvel APK

---

## 12. Pages d'information

| Page | URL | Accès |
|---|---|---|
| Comment ça marche | `/comment-ca-marche` | Public |
| Politique de confidentialité | `/confidentialite` | Public |

**"Comment ça marche"**
- Instructions pas-à-pas pour utiliser l'application
- Répartition du catalogue par catégorie avec nombre de jeux
- Règles d'emprunt (4 semaines, 2 prolongations, soin du matériel)
- Nombre total de jeux dans toutes les ludothèques

---

## 13. Futurs achats

Liste des jeux proposés pour un futur achat de la ludothèque, avec votes des membres. Les propositions, les votes et la période d'ouverture sont propres à chaque ludothèque (Joinville / La Rapée).

| Fonctionnalité | Web | Mobile |
|---|:---:|:---:|
| Liste des propositions avec photo, catégorie, joueurs, durée, âge conseillé | ✅ | ✅ |
| Proposer un jeu (titre, catégorie, lien optionnel) | ✅ | ✅ |
| Voter 👍 / 👎 avec compteurs | ✅ | ✅ |
| Supprimer une proposition (auteur ou admin) | ✅ | ✅ |
| Bandeau « déjà à la ludothèque » sur une proposition | ✅ | ✅ |
| Actualiser les infos d'une proposition (auteur ou admin) | ✅ | — |
| Tri : les plus appréciés, plus récents, A → Z | ✅ | — |
| Affichage liste / vignettes | ✅ | — |
| Réglage de la période d'ouverture et email d'annonce (admin) | ✅ | — |
| Archivage d'une session, consultation et suppression des archives (admin) | ✅ | — |

**Accès**
- Admin : `/admin/proposals` (onglet **Futurs achats** du menu admin), accessible en permanence
- Membres : `/proposals` (entrée **Futurs achats** du menu) et onglet **Achats** de l'application mobile, visibles uniquement pendant la période d'ouverture
- Hors période, les membres ne peuvent ni consulter, ni proposer, ni voter

**Proposer un jeu**
- Titre (obligatoire), catégorie (obligatoire), lien vers une page d'achat ou de présentation (optionnel)
- Un même titre ne peut être proposé qu'une fois par ludothèque
- À la validation, recherche automatique des informations du jeu :
  - sur la page du lien : photo, description, nombre de joueurs, durée, âge conseillé
  - sur BoardGameGeek (par le titre) en complément, avec traduction du résumé en français
- Si rien n'est trouvé, la proposition est créée quand même
- Les durées lues sur une boutique sont parfois des tranches (« moins de 30 mn », « 4 h et plus ») : valeur indicative

**Jeu déjà à la ludothèque**
- Une proposition est signalée par un bandeau quand un jeu de la même ludothèque porte le même nom (sans tenir compte de la casse, des accents et de la ponctuation) ou la même fiche BoardGameGeek
- Le bandeau mène à la fiche du jeu ; en mode vignettes, c'est un ruban en haut de la photo
- Le signalement apparaît aussi au moment de l'ajout ; la proposition est créée quand même
- Une extension n'est pas confondue avec son jeu de base

**Votes**
- Un vote par membre et par proposition : 👍 ou 👎
- Re-cliquer sur son vote le retire ; cliquer sur l'autre pouce le change
- Compteurs de pouces en l'air et en bas affichés sur chaque proposition

**Affichage** *(web)*
- Mode **liste** : votes en début de ligne, photo, infos, résumé, auteur, lien, actions
- Mode **vignettes** : photo en grand, titre, catégorie, joueurs / durée / âge et votes — pour voir plus de propositions d'un coup
- Le mode choisi est mémorisé sur l'appareil

**Période d'ouverture aux membres** *(admin)*
- Date et heure d'ouverture, date et heure de fermeture (heure de Paris)
- À l'ouverture, la page devient visible des membres ; à la fermeture, elle ne l'est plus
- Sans date de fermeture : ouverte sans limite après l'ouverture
- Sans date d'ouverture : page réservée aux admins
- Bandeau d'état : ouverte jusqu'au…, ouverture le…, fermée depuis…

**Email d'annonce aux membres** *(admin)*
- Disponible lorsque la page est ouverte aux membres
- Aperçu, envoi d'un test à soi-même, envoi à tous les membres actifs de la ludothèque
- Invite à proposer et à voter jusqu'à la date de fermeture, avec un bouton vers la page
- Précise que la fonctionnalité est disponible sur le site et que l'application mobile doit être mise à jour (lien vers `/download`)
- Envoi tracé dans le journal des emails (« Annonce futurs achats »)

**Archivage d'une session** *(admin)*
- « Archiver et remettre à zéro » : toutes les propositions en cours et leurs votes sont conservés dans une archive nommée (nom libre, sinon « Session archivée le … »)
- La page repart de zéro pour une future session : liste vide, dates d'ouverture et de fermeture effacées (la page n'est plus visible des membres jusqu'à la prochaine période)
- « Sessions archivées » : chaque archive est consultable, avec les jeux classés par votes, les compteurs 👍 / 👎, l'auteur et le lien
- Les archives sont en lecture seule (plus de vote possible) et visibles des admins uniquement
- Un jeu archivé peut être proposé à nouveau lors d'une session suivante
- « Supprimer cette archive » : suppression définitive de l'archive, de ses propositions et de leurs votes, après confirmation

---

## Intégrations externes

| Service | Usage |
|---|---|
| **BoardGameGeek API v2** | Récupération automatique : photo, résumé, joueurs, durée, âge (gratuit, sans clé) — jeux du catalogue et propositions d'achat |
| **Pages des boutiques en ligne** | Lecture de la photo, de la description et des caractéristiques d'un jeu proposé, à partir du lien fourni |
| **Neon PostgreSQL** | Base de données en production |
| **Vercel** | Hébergement web |
| **EAS Build** | Compilation de l'APK Android (profil `preview`), publié ensuite sur la page `/download` du site |
| **Email (SMTP)** | Rappels et relances d'emprunt |

---

*Document généré le 01/05/2026 (v0.42) — mis à jour le 09/10/2026 pour LudiGest v1.38 : emprunt attribué par un admin (section 7), connexion mobile et mise à jour de l'application (sections 1 et 11), futurs achats (section 13).*
