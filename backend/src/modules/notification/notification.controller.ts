import { Router, Request, Response } from 'express';
import { notificationService } from './notification.service';
import config from '../../config';
import { logger } from '../../common/services/logger.service';

const router = Router();

/**
 * Endpoint de diagnóstico para verificar la configuración de notificaciones
 * Muestra el estado de las variables de entorno (enmascaradas)
 */
router.get('/debug-config', (req: Request, res: Response) => {
    const mask = (str: string) => str ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : 'MISSING';

    const debugData = {
        twilio: {
            accountSid: mask(config.twilio.sid),
            authToken: config.twilio.token ? 'PRESENT (Masked)' : 'MISSING',
            fromPhone: config.twilio.phone || 'MISSING',
            whatsappPhone: config.twilio.whatsappPhone || 'MISSING',
            messagingServiceSid: mask(config.twilio.messagingServiceSid),
            panicTemplateId: config.twilio.whatsappTemplateId || 'MISSING',
            accessTemplateId: config.twilio.whatsappAccessTemplateId || 'MISSING',
        },
        email: {
            resendApiKey: config.email.resendApiKey ? 'PRESENT (Masked)' : 'MISSING',
            fromEmail: config.email.from || 'MISSING',
        },
        env: {
            nodeEnv: config.env,
            simulationMode: notificationService.isInSimulationMode(),
        }
    };

    res.json({
        success: true,
        data: debugData
    });
});

/**
 * Endpoint para enviar un mensaje de prueba
 */
router.post('/test-twilio', async (req: Request, res: Response) => {
    const { to, type, patientName } = req.body;

    if (!to) {
        return res.status(400).json({ success: false, error: 'Se requiere el número de destino (to)' });
    }

    try {
        logger.info(`🧪 Iniciando prueba de Twilio para: ${to}`);

        // Probar WhatsApp
        const whatsappResult = await notificationService.sendEmergencyWhatsApp({
            to,
            patientName: patientName || 'Prueba de Sistema',
            location: { lat: 19.4326, lng: -99.1332 }, // CDMX por defecto para prueba
            type: type || 'PANIC',
        });

        // Probar SMS
        const smsResult = await notificationService.sendEmergencySMS({
            to,
            patientName: patientName || 'Prueba de Sistema',
            location: { lat: 19.4326, lng: -99.1332 },
            type: type || 'PANIC',
        });

        res.json({
            success: true,
            results: {
                whatsapp: whatsappResult,
                sms: smsResult
            }
        });

    } catch (error: any) {
        logger.error('❌ Error en endpoint de prueba de Twilio:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.code
        });
    }
});

export default router;
