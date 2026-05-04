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
- Historique de tous les emails envoyés par emprunt (type, date)
- Affiché en tooltip / popover

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
| ⚙️ Admin | Admin uniquement |

**Spécificités mobile**
- Token JWT stocké de façon sécurisée (Expo SecureStore)
- Changement de ludothèque depuis "Mon compte" → liste mise à jour en temps réel
- Pull-to-refresh sur les listes
- Scanner natif (caméra Android)
- Lien vers "Comment ça marche" (ouvre le navigateur)

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

## Intégrations externes

| Service | Usage |
|---|---|
| **BoardGameGeek API v2** | Récupération automatique : photo, résumé, joueurs, durée, âge (gratuit, sans clé) |
| **Neon PostgreSQL** | Base de données en production |
| **Vercel** | Hébergement web |
| **EAS Build** | Compilation de l'APK Android |
| **Email (SMTP)** | Rappels et relances d'emprunt |

---

*Document généré le 01/05/2026 — LudiGest v0.42*
