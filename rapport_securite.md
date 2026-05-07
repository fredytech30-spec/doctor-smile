# Rapport de Sécurité de la Base de Données - Doctor Smile

## 1. Contexte et Objectifs
Le projet Doctor Smile est une plateforme d'analyse financière propulsée par l'intelligence artificielle. Traitant des données hautement sensibles (chiffres d'affaires, mots de passe, scores de prédiction, paiements), une sécurité stricte au niveau de la base de données est impérative.

La politique de sécurité mise en place repose sur la **Défense en Profondeur** :
- Contrôle d'accès basé sur les rôles (RBAC).
- Sécurité au niveau des lignes (RLS) et anonymisation via des Vues.
- Encapsulation des droits d'écriture via des Procédures Stockées.
- Traçabilité inaltérable via des Déclencheurs (Triggers) d'Audit.

---

## 2. Politique RBAC (Role-Based Access Control)
La matrice d'accès a été structurée autour de cinq rôles distincts, suivant le principe du **moindre privilège** :

| Rôle MySQL | Utilisateur d'Exemple | Privilèges Accordés | Privilèges Refusés (REVOKE) |
| :--- | :--- | :--- | :--- |
| **`ROLE_DBA`** | `root` | Tous les privilèges (`ALL PRIVILEGES`). | Aucun. |
| **`ROLE_ANALYSTE`** | `analyste_fred` | `SELECT`, `INSERT` sur les tables métier. `EXECUTE` sur la procédure de validation. | `UPDATE`, `DELETE` sur les analyses. Accès total interdit aux `payments` et `audit_logs`. |
| **`ROLE_AGENT_IA`** | `ia_service` | `SELECT` uniquement sur la vue anonymisée. `UPDATE` exclusif sur le champ `score_prediction`. | Accès interdit aux données utilisateurs, paiements et mots de passe. |
| **`ROLE_AUDITEUR_EXTERNE`** | `auditeur_rgpd` | `SELECT` sur toutes les tables (incluant l'audit complet). | `INSERT`, `UPDATE`, `DELETE` formellement interdits sur toute la base. |
| **`ROLE_CLIENT`** | N/A (via vue RLS) | Peut uniquement lire ses propres données via la vue `vw_mes_analyses_client`. | Accès aux tables brutes interdit. |

---

## 3. Sécurité par l'Anonymisation (Vues)
Afin d'éviter l'exposition de données PII (Personal Identifiable Information) au modèle de Machine Learning, nous avons créé des vues restrictives.
- **La commande clé :**
  ```sql
  CREATE VIEW vw_donnees_ia_anonymes AS
  SELECT analyse_id, annee_fiscale, chiffre_affaires, resultat_net, tresorerie
  FROM analyses_financieres;
  ```
  L'IA se voit attribuer le droit `SELECT` sur cette vue uniquement. Elle ignore l'existence même des colonnes sensibles (noms, emails, numéros de téléphone).

---

## 4. Encapsulation des Mises à Jour (Procédures Stockées)
Donner un droit `UPDATE` sur une table financière à un analyste est dangereux (risque d'erreur humaine ou de modification d'anciennes clôtures). 
Nous avons supprimé le droit `UPDATE` à `ROLE_ANALYSTE` et créé une procédure :
- **`sp_valider_analyse(analyse_id, note)`**
- L'analyste n'a que le droit `EXECUTE`. La procédure contient un bloc conditionnel `IF/ELSE` qui bloque la modification si l'analyse est déjà marquée comme `VALIDE_FINAL`. C'est le SGBD qui garantit les règles métier, pas seulement l'application.

---

## 5. Audit Inaltérable (Triggers)
Pour tracer "Qui a fait quoi et quand", nous utilisons des déclencheurs (Triggers).
- Lorsqu'une modification intervient sur `analyses_financieres`, le SGBD intercepte l'action et insère automatiquement une ligne dans `audit_logs`.
- L'audit enregistre l'utilisateur base de données `USER()`, l'heure exacte, ainsi que l'**ancienne** valeur et la **nouvelle** valeur en format `JSON` pour comparaison.
- L'accès `DELETE` étant bloqué sur la table `audit_logs` pour tous (sauf DBA), cette trace est infalsifiable par un employé ou un hacker ayant piraté un compte Analyste.

---

## 6. Commandes de Vérification (Pour Démonstration)

*Voici les commandes à taper devant le professeur pour prouver le bon fonctionnement :*

**1. Connexion en tant qu'Analyste :**
```bash
mysql -u analyste_fred -p
# Mot de passe : Password123!
```

**2. Test de Lecture (Succès) :**
```sql
USE doctorsmile_secure_db;
SELECT * FROM vw_analyst_dashboard;
```

**3. Test de Violation de Privilège (Échec Attendu) :**
```sql
-- L'analyste essaie de supprimer une analyse ou de voir l'audit
DELETE FROM analyses_financieres WHERE analyse_id = 1;
-- Résultat : ERROR 1142 (42000): DELETE command denied to user 'analyste_fred'@'localhost'

SELECT * FROM audit_logs;
-- Résultat : ERROR 1142 (42000): SELECT command denied
```

**4. Test de l'Audit (Connexion en Auditeur) :**
```bash
mysql -u auditeur_rgpd -p
# Mot de passe : Password123!
```
```sql
USE doctorsmile_secure_db;
SELECT * FROM audit_logs;
-- Permet de prouver que l'Auditeur externe peut inspecter toutes les traces sans rien casser.
```
