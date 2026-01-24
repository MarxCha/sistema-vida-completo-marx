
import { NotificationService } from './notification.service';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';

// Mock external dependencies
jest.mock('twilio');
jest.mock('resend');
jest.mock('@prisma/client');
jest.mock('../../common/services/logger.service');

describe('NotificationService', () => {
  let service: NotificationService;
  
  beforeEach(() => {
    // Reset mocks and instance
    jest.clearAllMocks();
    service = new NotificationService();
  });

  describe('validateConfiguration', () => {
    it('should identify missing Twilio credentials', () => {
      // Backup original config
      const originalTwilio = { ...config.twilio };
      
      // Simulate missing config
      config.twilio.sid = '';
      config.twilio.token = '';
      
      const result = service.validateConfiguration();
      
      expect(result.twilio.configured).toBe(false);
      expect(result.twilio.missing).toContain('TWILIO_ACCOUNT_SID');
      expect(result.twilio.missing).toContain('TWILIO_AUTH_TOKEN');
      
      // Restore config
      config.twilio = originalTwilio;
    });

    it('should identify missing Resend credentials', () => {
      const originalEmail = { ...config.email };
      
      config.email.resendApiKey = '';
      
      const result = service.validateConfiguration();
      
      expect(result.email.configured).toBe(false);
      expect(result.email.missing).toContain('RESEND_API_KEY');
      
      config.email = originalEmail;
    });
  });

  // More tests can be added here for sendEmergencySMS, sendEmergencyWhatsApp, etc.
});
