"""
Escrow Service - Doctor Smile v4.0
Gestion des paiements sécurisés via Escrow
Intégration Mobile Money (Orange Money, MTN Mobile Money)
Commission DoctorSmile : 10-20%
"""

from typing import Dict, Optional, Any
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class EscrowService:
    """Service de gestion des paiements Escrow"""
    
    def __init__(self):
        self.commission_rate = 0.15  # 15% commission par défaut
        self.release_delay_hours = 24  # Délai avant libération des fonds
        self.payment_gateways = {
            "fapshi": {
                "name": "Fapshi",
                "commission": 0.02,  # 2% frais Fapshi
                "mobile_money": True
            },
            "notchpay": {
                "name": "NotchPay",
                "commission": 0.025,  # 2.5% frais NotchPay
                "mobile_money": True
            }
        }
    
    def create_escrow_transaction(
        self,
        booking_id: str,
        user_id: str,
        expert_id: str,
        amount: int,
        gateway: str = "fapshi"
    ) -> Dict[str, Any]:
        """
        Crée une transaction Escrow
        
        Args:
            booking_id: ID de la réservation
            user_id: ID de l'utilisateur (entrepreneur)
            expert_id: ID de l'expert
            amount: Montant total en FCFA
            gateway: Passerelle de paiement (fapshi, notchpay)
            
        Returns:
            Dict avec détails de la transaction
        """
        try:
            logger.info(f"[Escrow] Création transaction {booking_id}, montant {amount} FCFA")
            
            # Validation du gateway
            if gateway not in self.payment_gateways:
                raise ValueError(f"Passerelle {gateway} non supporté")
            
            gateway_info = self.payment_gateways[gateway]
            
            # Calcul des montants
            doctor_smile_commission = int(amount * self.commission_rate)
            gateway_commission = int(amount * gateway_info["commission"])
            expert_amount = amount - doctor_smile_commission - gateway_commission
            
            # Date de libération des fonds (24h après validation)
            release_date = datetime.utcnow() + timedelta(hours=self.release_delay_hours)
            
            transaction = {
                "transaction_id": f"ESCROW_{booking_id}",
                "booking_id": booking_id,
                "user_id": user_id,
                "expert_id": expert_id,
                "amount_total": amount,
                "amount_expert": expert_amount,
                "commission_doctorsmile": doctor_smile_commission,
                "commission_gateway": gateway_commission,
                "gateway": gateway,
                "status": "pending_payment",
                "created_at": datetime.utcnow().isoformat(),
                "release_date": release_date.isoformat(),
                "payment_link": self._generate_payment_link(booking_id, gateway, amount)
            }
            
            logger.info(f"[Escrow] Transaction créée : {transaction['transaction_id']}")
            return transaction
            
        except Exception as e:
            logger.error(f"[Escrow] Erreur création transaction: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def confirm_payment(
        self,
        transaction_id: str,
        payment_reference: str
    ) -> Dict[str, Any]:
        """
        Confirme le paiement et met la transaction en attente de validation
        
        Args:
            transaction_id: ID de la transaction
            payment_reference: Référence du paiement
            
        Returns:
            Dict avec statut de la transaction
        """
        try:
            logger.info(f"[Escrow] Confirmation paiement {transaction_id}")
            
            # Simulation de confirmation (à remplacer par appel API gateway)
            return {
                "transaction_id": transaction_id,
                "status": "awaiting_validation",
                "payment_reference": payment_reference,
                "confirmed_at": datetime.utcnow().isoformat(),
                "message": "Paiement confirmé. En attente de validation de service."
            }
            
        except Exception as e:
            logger.error(f"[Escrow] Erreur confirmation paiement: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def release_funds(
        self,
        transaction_id: str,
        validated: bool = True
    ) -> Dict[str, Any]:
        """
        Libère les fonds à l'expert après validation du service
        
        Args:
            transaction_id: ID de la transaction
            validated: True si service validé, False si annulé
            
        Returns:
            Dict avec statut de libération
        """
        try:
            logger.info(f"[Escrow] Libération fonds {transaction_id}, validé={validated}")
            
            if validated:
                # Libération des fonds à l'expert
                return {
                    "transaction_id": transaction_id,
                    "status": "funds_released",
                    "released_at": datetime.utcnow().isoformat(),
                    "message": "Fonds libérés à l'expert."
                }
            else:
                # Remboursement à l'utilisateur
                return {
                    "transaction_id": transaction_id,
                    "status": "refunded",
                    "refunded_at": datetime.utcnow().isoformat(),
                    "message": "Remboursement effectué à l'utilisateur."
                }
            
        except Exception as e:
            logger.error(f"[Escrow] Erreur libération fonds: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def get_transaction_status(
        self,
        transaction_id: str
    ) -> Dict[str, Any]:
        """
        Récupère le statut d'une transaction
        
        Args:
            transaction_id: ID de la transaction
            
        Returns:
            Dict avec statut et détails
        """
        try:
            # Simulation (à remplacer par requête Firestore)
            return {
                "transaction_id": transaction_id,
                "status": "awaiting_validation",
                "created_at": datetime.utcnow().isoformat(),
                "release_date": (datetime.utcnow() + timedelta(hours=24)).isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Escrow] Erreur statut transaction: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def _generate_payment_link(
        self,
        booking_id: str,
        gateway: str,
        amount: int
    ) -> str:
        """Génère le lien de paiement"""
        # Simulation de génération de lien (à remplacer par API gateway)
        return f"https://payment.doctorsmile.cm/{gateway}/{booking_id}?amount={amount}"


# Instance singleton
escrow_service = EscrowService()
