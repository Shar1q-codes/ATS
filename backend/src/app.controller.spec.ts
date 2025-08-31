import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API message', () => {
      expect(appController.getHello()).toBe('AI-Native ATS API is running!');
    });

    it('should return health status', () => {
      const health = appController.getHealth();
      expect(health).toHaveProperty('status', 'ok');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('environment');
      expect(health).toHaveProperty('version');
    });
  });
});
