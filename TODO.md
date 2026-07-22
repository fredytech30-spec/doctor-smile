# TODO - Doctor Smile (frontend/backend)

## Objectif
Valider et afficher correctement la logique IA + recommandations sur le frontend Next.js, en s’appuyant sur le backend FastAPI.

## Checklist
- [ ] Vérifier l’absence d’écran détail analyse `frontend/src/app/dashboard/analyses/[id]/page.tsx`.
- [ ] Créer `frontend/src/app/dashboard/analyses/[id]/page.tsx` pour afficher :
  - [ ] Cash/Runway (CashBurnWidget + RunwayWidget)
  - [ ] Explicabilité (ExplicabilityWidget)
  - [ ] Plans d’actions (ActionPlansWidget)
  - [ ] Early warnings / alertes (widget ou section)
  - [ ] Benchmark sectoriel (créer widget si absent)
- [ ] Brancher `dashboard/page.tsx` pour rediriger vers la page détail ou afficher les widgets avec les bonnes données.
- [ ] Vérifier le câblage de `ExplicabilityWidget` : mapping exact backend→frontend.
- [ ] Vérifier le mapping `action_plan` backend→`ActionPlansWidget` (shape attendu).
- [ ] Vérifier la disponibilité des endpoints backend :
  - [ ] `GET /analyses/{id}`
  - [ ] routes export / report
- [ ] Une fois câblé : lancer build/test front et vérifier la route.

