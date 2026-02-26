# AREAS - Sistema VIDA

## Definicion de Areas

| Area | Scope | Owner |
|------|-------|-------|
| backend | /backend/** | Backend Team |
| frontend | /frontend/** | Frontend Team |
| database | /backend/prisma/** | DBA |
| devops | docker-compose.yml, .env*, Coolify | DevOps |
| docs | *.md, /docs/** | Tech Writer |

## Modulos Backend

| Modulo | Ruta | Responsabilidad |
|--------|------|-----------------|
| auth | /backend/src/modules/auth/ | Autenticacion y sesiones |
| pup | /backend/src/modules/pup/ | Perfil Unificado del Paciente |
| directives | /backend/src/modules/directives/ | Voluntades anticipadas |
| representatives | /backend/src/modules/representatives/ | Contactos de emergencia |
| emergency | /backend/src/modules/emergency/ | Protocolo de Acceso de Emergencia |
| documents | /backend/src/modules/documents/ | Gestion de documentos |
| payments | /backend/src/modules/payments/ | Pagos y suscripciones |
| wallet | /backend/src/modules/wallet/ | Billetera digital |
| admin | /backend/src/modules/admin/ | Panel administrativo |
| notification | /backend/src/modules/notification/ | SMS/WhatsApp/Email |
| hospital | /backend/src/modules/hospital/ | Integracion hospitales |
| insurance | /backend/src/modules/insurance/ | Aseguradoras |
| panic | /backend/src/modules/panic/ | Boton de panico |
| odoo | /backend/src/modules/odoo/ | Integracion Odoo |

## Componentes Frontend

| Componente | Ruta | Responsabilidad |
|------------|------|-----------------|
| layouts | /frontend/src/components/layouts/ | Layouts principales |
| pages | /frontend/src/components/pages/ | Vistas de pagina |
| context | /frontend/src/context/ | Estado global React |
| services | /frontend/src/services/ | Clientes API |
| hooks | /frontend/src/hooks/ | Custom hooks |
