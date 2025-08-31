import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { StartupService } from '../startup.service';

describe('StartupService', () => {
  let service: StartupService;
  let configService: ConfigService;
  let dataSource: DataSource;

  const mockDataSource = {
    isInitialized: true,
    initialize: jest.fn(),
    query: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<StartupService>(StartupService);
    configService = module.get<ConfigService>(ConfigService);
    dataSource = module.get<DataSource>(getDataSourceToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return health status', () => {
      const status = service.getHealthStatus();

      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('startupTime');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('services');
      expect(typeof status.healthy).toBe('boolean');
      expect(status.startupTime).toBeInstanceOf(Date);
      expect(typeof status.uptime).toBe('number');
      expect(typeof status.services).toBe('object');
    });
  });

  describe('onModuleInit', () => {
    it('should initialize services on module init', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'REDIS_URL':
            return 'redis://localhost:6379';
          case 'OPENAI_API_KEY':
            return 'sk-test-key';
          case 'SUPABASE_URL':
            return 'https://test.supabase.co';
          case 'SUPABASE_ANON_KEY':
            return 'test-key';
          default:
            return undefined;
        }
      });

      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      await service.onModuleInit();

      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should handle database connection failure', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      await service.onModuleInit();

      const status = service.getHealthStatus();
      expect(status.healthy).toBe(false);
      expect(status.services.database).toBe(false);
    });
  });

  describe('restartService', () => {
    it('should restart database service successfully', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.restartService('database');

      expect(result).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should handle database restart failure', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      const result = await service.restartService('database');

      expect(result).toBe(false);
    });

    it('should handle unknown service', async () => {
      const result = await service.restartService('unknown');

      expect(result).toBe(false);
    });

    it('should restart redis service', async () => {
      mockConfigService.get.mockReturnValue(null); // No Redis URL

      const result = await service.restartService('redis');

      expect(result).toBe(true); // Should succeed even without Redis
    });

    it('should restart openai service', async () => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      const result = await service.restartService('openai');

      expect(result).toBe(true);
    });

    it('should restart storage service', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
        if (key === 'SUPABASE_ANON_KEY') return 'test-key';
        return undefined;
      });

      const result = await service.restartService('storage');

      expect(result).toBe(true);
    });
  });
});
