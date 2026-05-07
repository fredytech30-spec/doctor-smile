-- ==============================================================================
-- PROJET DOCTOR SMILE : SÉCURITÉ DE LA BASE DE DONNÉES (VERSION COMPLÈTE)
-- OBJECTIF : Modélisation intégrale (13 tables) + Politique de Sécurité Stricte
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS doctorsmile_full_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doctorsmile_full_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs, payments, whatsapp_configs, ia_conversations, cosignatures, ml_predictions, financial_analyses, uploads, companies, rgpd_requests, cabinet_members, cabinets, users;
DROP VIEW IF EXISTS vw_mes_entreprises, vw_ml_training_data, vw_peer_benchmark_public;
DROP PROCEDURE IF EXISTS sp_valider_et_alerter;
DROP ROLE IF EXISTS 'ROLE_DBA', 'ROLE_EXPERT_COMPTABLE', 'ROLE_AGENT_IA', 'ROLE_AUDITEUR_LEGAL';
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 1. SCHÉMA GLOBAL DE LA BASE DE DONNÉES (13 TABLES)
-- ==============================================================================

-- --- DOMAINE : CORE & UTILISATEURS ---
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    system_role ENUM('ADMIN', 'EXPERT', 'CLIENT', 'IA_SERVICE', 'AUDIT') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cabinets (
    cabinet_id INT AUTO_INCREMENT PRIMARY KEY,
    nom_cabinet VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cabinet_members (
    cabinet_id INT,
    user_id INT,
    role_in_cabinet ENUM('ADMIN', 'MEMBER') DEFAULT 'MEMBER',
    PRIMARY KEY(cabinet_id, user_id),
    FOREIGN KEY (cabinet_id) REFERENCES cabinets(cabinet_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE rgpd_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    request_type ENUM('DELETE', 'EXPORT') NOT NULL,
    status ENUM('PENDING', 'PROCESSED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- --- DOMAINE : ACQUISITION DE DONNÉES ---
CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    nom_entreprise VARCHAR(100) NOT NULL,
    siret VARCHAR(20) UNIQUE,
    secteur VARCHAR(50),
    pays VARCHAR(50),
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE uploads (
    upload_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    row_count INT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- --- DOMAINE : ANALYSE & MACHINE LEARNING ---
CREATE TABLE financial_analyses (
    analyse_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    upload_id INT,
    fiscal_year INT NOT NULL,
    ca DECIMAL(15, 2),
    resultat_net DECIMAL(15, 2),
    tresorerie DECIMAL(15, 2),
    statut ENUM('EN_ATTENTE', 'EN_COURS', 'VALIDE_IA', 'VALIDE_EXPERT') DEFAULT 'EN_ATTENTE',
    expert_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (upload_id) REFERENCES uploads(upload_id) ON DELETE SET NULL
);

CREATE TABLE ml_predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    analyse_id INT NOT NULL UNIQUE,
    bankrupt_prob DECIMAL(5,4),
    score_final DECIMAL(5,2),
    model_version VARCHAR(20),
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analyse_id) REFERENCES financial_analyses(analyse_id) ON DELETE CASCADE
);

-- --- DOMAINE : COLLABORATION & PAIRS ---
CREATE TABLE cosignatures (
    cosign_id INT AUTO_INCREMENT PRIMARY KEY,
    analyse_id INT NOT NULL,
    requester_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    commentaires TEXT,
    FOREIGN KEY (analyse_id) REFERENCES financial_analyses(analyse_id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(user_id),
    FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
);

-- --- DOMAINE : INTERACTION & ALERTES ---
CREATE TABLE ia_conversations (
    conv_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    analyse_id INT,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (analyse_id) REFERENCES financial_analyses(analyse_id) ON DELETE SET NULL
);

CREATE TABLE whatsapp_configs (
    wa_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    wa_token VARCHAR(255) NOT NULL, -- TRÈS SENSIBLE
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- --- DOMAINE : MONÉTISATION ---
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    stripe_charge_id VARCHAR(100) UNIQUE,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- --- DOMAINE : SÉCURITÉ ---
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_data JSON,
    new_data JSON,
    db_user VARCHAR(100) NOT NULL,
    action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. VUES DE SÉCURITÉ AVANCÉES (Masquage, Anonymisation, RLS)
-- ==============================================================================

-- A. Vue Anonymisée pour l'entraînement ML (Pas de PII)
CREATE VIEW vw_ml_training_data AS
SELECT 
    f.fiscal_year,
    f.ca,
    f.resultat_net,
    f.tresorerie,
    c.secteur,
    c.pays,
    m.bankrupt_prob,
    m.score_final
FROM financial_analyses f
JOIN companies c ON f.company_id = c.company_id
LEFT JOIN ml_predictions m ON f.analyse_id = m.analyse_id
WHERE f.statut = 'VALIDE_EXPERT';

-- B. Vue Benchmark Public (Agrégation pour ne pas fuiter les données d'un concurrent)
CREATE VIEW vw_peer_benchmark_public AS
SELECT 
    c.secteur,
    c.pays,
    COUNT(f.analyse_id) AS total_analyses,
    AVG(m.score_final) AS score_moyen
FROM companies c
JOIN financial_analyses f ON c.company_id = f.company_id
JOIN ml_predictions m ON f.analyse_id = m.analyse_id
GROUP BY c.secteur, c.pays;

-- C. Vue Row-Level Security (RLS) pour les Experts
CREATE VIEW vw_mes_entreprises AS
SELECT c.company_id, c.nom_entreprise, c.siret, c.secteur
FROM companies c
JOIN users u ON c.owner_id = u.user_id
WHERE u.username = SUBSTRING_INDEX(USER(), '@', 1);

-- ==============================================================================
-- 3. ENCAPSULATION DES RÈGLES MÉTIER (PROCÉDURES STOCKÉES)
-- ==============================================================================

DELIMITER $$
CREATE PROCEDURE sp_valider_et_alerter(IN p_analyse_id INT, IN p_note TEXT)
BEGIN
    -- Cette procédure valide l'analyse. L'Expert n'a PAS le droit de faire d'UPDATE direct.
    DECLARE current_status VARCHAR(20);
    SELECT statut INTO current_status FROM financial_analyses WHERE analyse_id = p_analyse_id;
    
    IF current_status = 'VALIDE_EXPERT' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Impossible de modifier : Analyse déjà validée.';
    ELSE
        UPDATE financial_analyses 
        SET statut = 'VALIDE_EXPERT', expert_note = p_note
        WHERE analyse_id = p_analyse_id;
    END IF;
END$$
DELIMITER ;

-- ==============================================================================
-- 4. DÉCLENCHEURS (TRIGGERS) D'AUDIT
-- ==============================================================================

DELIMITER $$
CREATE TRIGGER trg_financial_update
AFTER UPDATE ON financial_analyses
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (table_name, record_id, action_type, old_data, new_data, db_user)
    VALUES (
        'financial_analyses', NEW.analyse_id, 'UPDATE',
        JSON_OBJECT('statut', OLD.statut, 'ca', OLD.ca),
        JSON_OBJECT('statut', NEW.statut, 'ca', NEW.ca),
        USER()
    );
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER trg_payments_delete
AFTER DELETE ON payments
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (table_name, record_id, action_type, old_data, new_data, db_user)
    VALUES (
        'payments', OLD.payment_id, 'DELETE',
        JSON_OBJECT('amount', OLD.amount, 'stripe_charge_id', OLD.stripe_charge_id),
        NULL,
        USER()
    );
END$$
DELIMITER ;

-- ==============================================================================
-- 5. MATRICE RBAC (SÉCURITÉ D'ACCÈS)
-- ==============================================================================

CREATE ROLE 'ROLE_DBA', 'ROLE_EXPERT_COMPTABLE', 'ROLE_AGENT_IA', 'ROLE_AUDITEUR_LEGAL';

-- --- ROLE_DBA : Accès total ---
GRANT ALL PRIVILEGES ON doctorsmile_full_db.* TO 'ROLE_DBA';

-- --- ROLE_EXPERT_COMPTABLE ---
GRANT SELECT, INSERT ON doctorsmile_full_db.companies TO 'ROLE_EXPERT_COMPTABLE';
GRANT SELECT, INSERT ON doctorsmile_full_db.uploads TO 'ROLE_EXPERT_COMPTABLE';
GRANT SELECT, INSERT ON doctorsmile_full_db.financial_analyses TO 'ROLE_EXPERT_COMPTABLE';
GRANT SELECT, INSERT ON doctorsmile_full_db.cosignatures TO 'ROLE_EXPERT_COMPTABLE';
GRANT SELECT ON doctorsmile_full_db.vw_peer_benchmark_public TO 'ROLE_EXPERT_COMPTABLE';
GRANT EXECUTE ON PROCEDURE doctorsmile_full_db.sp_valider_et_alerter TO 'ROLE_EXPERT_COMPTABLE';
-- L'expert ne voit pas l'audit, ne gère pas les paiements et ne modifie pas les tokens WhatsApp
-- (Droits implicitement refusés)

-- --- ROLE_AGENT_IA ---
-- L'IA se forme sur la vue anonymisée
GRANT SELECT ON doctorsmile_full_db.vw_ml_training_data TO 'ROLE_AGENT_IA';
GRANT SELECT, INSERT ON doctorsmile_full_db.ml_predictions TO 'ROLE_AGENT_IA';
GRANT SELECT, INSERT ON doctorsmile_full_db.ia_conversations TO 'ROLE_AGENT_IA';

-- --- ROLE_AUDITEUR_LEGAL ---
-- Accès total en lecture, notamment pour les logs d'audit et le RGPD
GRANT SELECT ON doctorsmile_full_db.* TO 'ROLE_AUDITEUR_LEGAL';

-- ==============================================================================
-- 6. UTILISATEURS DE TEST
-- ==============================================================================

DROP USER IF EXISTS 'expert_paul'@'localhost';
DROP USER IF EXISTS 'ia_bot'@'localhost';
DROP USER IF EXISTS 'auditeur_etat'@'localhost';

CREATE USER 'expert_paul'@'localhost' IDENTIFIED BY 'Password123!';
CREATE USER 'ia_bot'@'localhost' IDENTIFIED BY 'Password123!';
CREATE USER 'auditeur_etat'@'localhost' IDENTIFIED BY 'Password123!';

GRANT 'ROLE_EXPERT_COMPTABLE' TO 'expert_paul'@'localhost';
GRANT 'ROLE_AGENT_IA' TO 'ia_bot'@'localhost';
GRANT 'ROLE_AUDITEUR_LEGAL' TO 'auditeur_etat'@'localhost';

SET DEFAULT ROLE 'ROLE_EXPERT_COMPTABLE' TO 'expert_paul'@'localhost';
SET DEFAULT ROLE 'ROLE_AGENT_IA' TO 'ia_bot'@'localhost';
SET DEFAULT ROLE 'ROLE_AUDITEUR_LEGAL' TO 'auditeur_etat'@'localhost';

-- Données factices pour tester l'architecture
INSERT INTO users (username, email, password_hash, system_role) VALUES 
('expert_paul', 'paul@cabinet.com', 'hash', 'EXPERT');

INSERT INTO companies (owner_id, nom_entreprise, siret, secteur, pays) VALUES 
(1, 'AgriCameroun SA', '000111222', 'Agriculture', 'Cameroun');

INSERT INTO financial_analyses (company_id, fiscal_year, ca, resultat_net, tresorerie) VALUES 
(1, 2023, 2000000.00, 150000.00, 50000.00);

-- Fin du script.
