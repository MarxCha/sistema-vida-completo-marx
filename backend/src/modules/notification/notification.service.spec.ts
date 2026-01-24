
import { NotificationService } from './notification.service';
import { config } from '../../config';
import { Resend } from 'resend';
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';

// Mock external dependencies
jest.mock('twilio', () => {
  const mTwilio = {
    messages: {
      create: jest.fn(),
    },
  };
  return jest.fn(() => mTwilio);
});

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(),
      },
    })),
  };
});

jest.mock('../../common/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Prisma
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      representative: {
        findMany: jest.fn(),
      },
    })),
    NotificationType: { PANIC: 'PANIC' }, 
    NotificationChannel: { SMS: 'SMS', EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP' },
    NotificationStatus: { SENT: 'SENT', FAILED: 'FAILED' }
  };
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockTwilioClient: any;
  let mockResendClient: any;
  let mockFindMany: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Config setup
    config.twilio.sid = 'ACmock';
    config.twilio.token = 'mock-token';
    config.twilio.phone = '+1234567890';
    config.email.resendApiKey = 're_mock';
    
    // Initialize service
    service = new NotificationService();
    
    // Get mock instances
    mockTwilioClient = (twilio as unknown as jest.Mock).mock.results[0].value;
    const ResendMock = Resend as unknown as jest.Mock;
    mockResendClient = ResendMock.mock.instances[0];

    // Get Prisma mock
    const PrismaMock = PrismaClient as unknown as jest.Mock;
    // Since PrismaClient is instantiated at module level, we need the instance created during import
    // But since we are in beforeEach, and jest.resetModules isn't called, the instance might persist or be recreated if we reload modules
    // However, simplest way is to assume the instance is the last one created or the first one.
    // Given the structure, let's grab the instance.
    const mockPrismaInstance = PrismaMock.mock.instances[0];
    mockFindMany = mockPrismaInstance.representative.findMany;
  });

  describe('validateConfiguration', () => {
    it('should identify missing Twilio credentials', () => {
      const originalTwilio = { ...config.twilio };
      config.twilio.sid = '';
      
      const result = service.validateConfiguration();
      
      expect(result.twilio.configured).toBe(false);
      expect(result.twilio.missing).toContain('TWILIO_ACCOUNT_SID');
      
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

  describe('sendEmergencySMS', () => {
    const mockParams = {
      to: '+525512345678',
      patientName: 'Juan Pérez',
      location: { lat: 19.4326, lng: -99.1332 },
      type: 'PANIC' as const,
      nearestHospital: 'Hospital General',
    };

    it('should send SMS via Twilio when configured', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM123' });

      const result = await service.sendEmergencySMS(mockParams);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(expect.objectContaining({
        to: mockParams.to,
        from: config.twilio.phone,
        body: expect.stringContaining('Juan Pérez'),
      }));
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM123');
    });

    it('should handle Twilio errors gracefully', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(new Error('Twilio error'));

      const result = await service.sendEmergencySMS(mockParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio error');
    });

    it('should skip sending if simulation mode is active (missing creds)', async () => {
      const originalSid = config.twilio.sid;
      config.twilio.sid = '';
      
      service = new NotificationService(); 
      
      const result = await service.sendEmergencySMS(mockParams);

      expect(result.success).toBe(true); 
      expect(result.messageId).toContain('SIMULATION');
      
      config.twilio.sid = originalSid;
    });
  });

  describe('sendEmergencyEmail', () => {
    const mockParams = {
      to: 'rep@example.com',
      patientName: 'Juan Pérez',
      location: { lat: 19.4326, lng: -99.1332 },
      type: 'PANIC' as const,
      nearestHospital: 'Hospital General',
    };

    it('should send email via Resend when configured', async () => {
      mockResendClient.emails.send.mockResolvedValue({ data: { id: 'email_123' }, error: null });

      const result = await service.sendEmergencyEmail(mockParams);

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(expect.objectContaining({
        to: mockParams.to,
        subject: expect.stringContaining('ALERTA DE EMERGENCIA'),
        html: expect.stringContaining('Juan Pérez'),
      }));
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email_123');
    });

    it('should handle Resend errors', async () => {
      mockResendClient.emails.send.mockResolvedValue({ data: null, error: { message: 'Resend error' } });

      const result = await service.sendEmergencyEmail(mockParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resend error');
    });
  });

  describe('notifyAllRepresentatives', () => {
    const panicParams = {
      userId: 'user-123',
      patientName: 'Juan Pérez',
      type: 'PANIC' as const,
      location: { lat: 19.4326, lng: -99.1332 },
      nearestHospital: 'Hospital General',
    };

    it('should notify all representatives via all channels', async () => {
      const mockReps = [
        { id: 'rep1', name: 'Rep 1', phone: '+5211111111', email: 'rep1@test.com', notifyOnEmergency: true, priority: 1, userId: 'user-123', relationship: 'Father', createdAt: new Date(), updatedAt: new Date() },
        { id: 'rep2', name: 'Rep 2', phone: '+5222222222', email: 'rep2@test.com', notifyOnEmergency: true, priority: 2, userId: 'user-123', relationship: 'Mother', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(mockReps);

      mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM_TEST' });
      mockResendClient.emails.send.mockResolvedValue({ data: { id: 'EMAIL_TEST' }, error: null });

      const results = await service.notifyAllRepresentatives(panicParams);

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: panicParams.userId, notifyOnEmergency: true }
      }));

      expect(results).toHaveLength(2);
      expect(results[0].smsStatus).toBe('sent');
      expect(results[0].emailStatus).toBe('sent');
      expect(results[1].smsStatus).toBe('sent');
    });

    it('should handle empty representative list', async () => {
      mockFindMany.mockResolvedValue([]);

      const results = await service.notifyAllRepresentatives(panicParams);

      expect(results).toHaveLength(0);
    });
    
    it('should continue notifying others if one fails', async () => {
        const mockReps = [
          { id: 'rep1', name: 'Rep 1', phone: '+5211111111', email: 'rep1@test.com', notifyOnEmergency: true, priority: 1, userId: 'user-123', relationship: 'Father', createdAt: new Date(), updatedAt: new Date() },
          { id: 'rep2', name: 'Rep 2', phone: '+5222222222', email: 'rep2@test.com', notifyOnEmergency: true, priority: 2, userId: 'user-123', relationship: 'Mother', createdAt: new Date(), updatedAt: new Date() },
        ];
        mockFindMany.mockResolvedValue(mockReps);
  
        mockTwilioClient.messages.create
          .mockRejectedValueOnce(new Error('SMS Failed'))
          .mockResolvedValue({ sid: 'SM_OK' }); 
          
        mockResendClient.emails.send.mockResolvedValue({ data: { id: 'EMAIL_OK' }, error: null });
  
        const results = await service.notifyAllRepresentatives(panicParams);
  
        expect(results).toHaveLength(2);
        expect(results[0].smsStatus).toBe('failed');
        expect(results[1].smsStatus).toBe('sent');
      });
  });
});
