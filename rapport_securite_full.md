# Rapport de Sécurité Base de Données - Doctor Smile (Version Complète)

## 1. Contexte du Projet & Architecture Globale
Le projet Doctor Smile est une plateforme complexe (multi-tenants) destinée aux experts-comptables, combinant l'analyse financière, des prédictions par Intelligence Artificielle (Machine Learning), des outils de collaboration (Cosignature) et des flux de paiement. 

Pour répondre aux normes de sécurité exigées dans la FinTech et se conformer au RGPD, la base de données relationnelle a été scindée en 13 tables réparties sur plusieurs domaines :
- **Core & Users** (`users`, `cabinets`, `rgpd_requests`)
- **Acquisition** (`companies`, `uploads`)
- **ML & Analyse** (`financial_analyses`, `ml_predictions`)
- **Collaboration** (`cosignatures`, `ia_conversations`, `whatsapp_configs`)
- **Monétisation** (`payments`)
- **Sécurité** (`audit_logs`)

L'enjeu de sécurité majeur ici est le cloissonnement de la donnée (Privilege Separation).

---

## 2. Politique de Sécurité : RBAC (Role-Based Access Control)
L'approche choisie pour gérer cette complexité est le RBAC strict. La matrice d'accès est définie comme suit :

| Rôle | Cible | Droits & Restrictions |
| :--- | :--- | :--- |
| **`ROLE_DBA`** | Technique | Accès total. |
| **`ROLE_EXPERT_COMPTABLE`** | Métier | `SELECT, INSERT` sur le domaine Analyse et Collaboration. **Interdiction (`REVOKE` implicite)** de modifier les paiements, d'effacer les audits, ou d'écrire le score prédictif réservé au ML. |
| **`ROLE_AGENT_IA`** | Technique (Backend) | Droit d'écriture *uniquement* sur les champs du Machine Learning (`ml_predictions`) et les conversations de chat. Accès aux données financières en lecture *uniquement* via des vues anonymisées. |
| **`ROLE_AUDITEUR_LEGAL`** | Légal / Conformité | `SELECT` exclusif sur toute la base. Impossible d'altérer la moindre donnée. |

---

## 3. Sécurité au Niveau des Lignes (Row-Level Security & Vues)

La séparation des privilèges s'effectue aussi de manière horizontale pour éviter la fuite d'informations (Data Leaks).

1. **Anonymisation pour l'Intelligence Artificielle**
   - Le modèle d'IA n'a pas besoin de connaître les noms, emails, ou numéros SIRET pour calculer un risque de faillite.
   - Nous avons créé **`vw_ml_training_data`** : une vue qui ne projette que les chiffres financiers purs (`ca`, `tresorerie`) et les scores. Le `ROLE_AGENT_IA` ne peut faire des requêtes *que* sur cette vue, rendant techniquement impossible l'accès aux données privées (PII).

2. **Benchmark Public Sans Divulgation**
   - L'application propose un classement entre entreprises du même secteur.
   - La vue **`vw_peer_benchmark_public`** utilise des fonctions d'agrégation (`AVG`, `COUNT`) et un `GROUP BY`. Ainsi, un expert peut voir la santé globale d'un secteur sans jamais voir les comptes d'une entreprise concurrente.

---

## 4. Encapsulation par Procédure Stockée
Pour empêcher un expert de trafiquer les statuts d'une analyse (par exemple en faisant un `UPDATE` manuel sur la table), le droit de modification direct a été retiré.
- Tout passe par la procédure **`sp_valider_et_alerter(analyse_id, note)`**.
- Cette procédure contient la logique métier : elle vérifie avec un `IF` si l'analyse n'est pas déjà verrouillée avant d'autoriser la modification. C'est la base de données qui devient la garante absolue des règles métier.

---

## 5. Traçabilité et Audit (Triggers Inaltérables)
Dans le domaine financier, la traçabilité est légalement obligatoire.
- Deux triggers (`trg_financial_update` et `trg_payments_delete`) interceptent toutes les modifications ou suppressions critiques.
- Ces triggers insèrent un enregistrement dans `audit_logs` contenant l'utilisateur connecté (`USER()`), le timestamp exact, et l'écartement des données (`JSON_OBJECT(old_data)` vs `JSON_OBJECT(new_data)`).
- Les experts ne peuvent pas effacer cette table, ce qui constitue une preuve inaltérable de fraude en cas de modification illicite.

---

## 6. Démonstration (Commandes pour le Jury)

Pour valider l'implémentation, voici les commandes à taper.

**1. Import du schéma complet :**
```bash
mysql -u root -p < doctorsmile_security_full.sql
```

**2. Tester le RBAC :**
Connectez-vous avec le compte Expert :
```bash
mysql -u expert_paul -p
# mdp: Password123!
```

Essayez de modifier une analyse (Ce qui échouera car il n'a pas le droit UPDATE sur la table brute) :
```sql
USE doctorsmile_full_db;
UPDATE financial_analyses SET ca = 9999999 WHERE analyse_id = 1;
-- ERROR 1142 (42000): UPDATE command denied
```

Validez correctement l'analyse (Ce qui réussira, car il utilise la procédure stockée) :
```sql
CALL sp_valider_et_alerter(1, "Analyse validée suite à la vérification des comptes.");
-- Query OK, 1 row affected
```

**3. Prouver le travail de l'Audit :**
Reconnectez-vous en Auditeur :
```bash
mysql -u auditeur_etat -p
# mdp: Password123!
```
```sql
USE doctorsmile_full_db;
SELECT * FROM audit_logs;
-- Vous verrez la trace complète de la modification effectuée par l'expert_paul avec l'ancien statut et le nouveau.
```
