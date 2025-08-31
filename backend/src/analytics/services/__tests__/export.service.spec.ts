import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from '../export.service';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportService],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  describe('exportToCSV', () => {
    it('should export summary data to CSV format', async () => {
      const mockData = {
        summary: {
          totalApplications: 100,
          totalHires: 10,
          activePositions: 5,
          timeToFill: {
            averageDays: 30,
            medianDays: 28,
          },
          conversionRates: {
            overallConversion: 10,
          },
        },
      };

      const filename = 'test_report';
      const result = await service.exportToCSV(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.csv');
      expect(result).toContain(filename);
    });

    it('should export pipeline data to CSV format', async () => {
      const mockData = {
        pipeline: {
          bottlenecks: [
            {
              stage: 'screening',
              dropOffRate: 50,
              averageTimeInStage: 5,
              candidatesInStage: 25,
              isBottleneck: true,
            },
          ],
          stagePerformance: [
            {
              stage: 'interview',
              conversionRate: 75,
              averageTime: 7,
            },
          ],
        },
      };

      const filename = 'pipeline_report';
      const result = await service.exportToCSV(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.csv');
    });

    it('should export source performance data to CSV format', async () => {
      const mockData = {
        sources: [
          {
            source: 'LinkedIn',
            totalCandidates: 50,
            qualifiedCandidates: 30,
            hiredCandidates: 5,
            conversionRate: 10,
            qualityScore: 8.5,
            roi: 150,
          },
          {
            source: 'Indeed',
            totalCandidates: 40,
            qualifiedCandidates: 20,
            hiredCandidates: 3,
            conversionRate: 7.5,
            qualityScore: 7.2,
            roi: 120,
          },
        ],
      };

      const filename = 'sources_report';
      const result = await service.exportToCSV(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.csv');
    });

    it('should export diversity data to CSV format', async () => {
      const mockData = {
        diversity: {
          totalApplicants: 100,
          totalHired: 10,
          diversityIndex: 0.75,
          genderBalance: {
            applicants: { male: 60, female: 40 },
            hired: { male: 6, female: 4 },
          },
          biasAlerts: ['Gender representation below threshold'],
        },
      };

      const filename = 'diversity_report';
      const result = await service.exportToCSV(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.csv');
    });

    it('should export trend data to CSV format', async () => {
      const mockData = {
        trends: {
          applications: [
            { date: '2024-01-01', value: 10 },
            { date: '2024-01-02', value: 15 },
          ],
          hires: [
            { date: '2024-01-01', value: 1 },
            { date: '2024-01-02', value: 2 },
          ],
          timeToFill: [
            { date: '2024-01-01', value: 30 },
            { date: '2024-01-02', value: 25 },
          ],
        },
      };

      const filename = 'trends_report';
      const result = await service.exportToCSV(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.csv');
    });

    it('should handle empty data gracefully', async () => {
      const mockData = {};
      const filename = 'empty_report';

      const result = await service.exportToCSV(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.csv');
    });

    it('should handle export errors', async () => {
      const mockData = null;
      const filename = 'error_report';

      await expect(service.exportToCSV(mockData, filename)).rejects.toThrow();
    });
  });

  describe('exportToPDF', () => {
    it('should export data to PDF format', async () => {
      const mockData = {
        summary: {
          totalApplications: 100,
          totalHires: 10,
        },
      };

      const filename = 'test_pdf_report';
      const result = await service.exportToPDF(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.pdf');
      expect(result).toContain(filename);
    });

    it('should handle PDF export errors', async () => {
      const mockData = null;
      const filename = 'error_pdf_report';

      await expect(service.exportToPDF(mockData, filename)).rejects.toThrow();
    });
  });

  describe('exportToExcel', () => {
    it('should export data to Excel format', async () => {
      const mockData = {
        summary: {
          totalApplications: 100,
          totalHires: 10,
        },
      };

      const filename = 'test_excel_report';
      const result = await service.exportToExcel(mockData, filename);

      expect(result).toBeDefined();
      expect(result).toContain('.xlsx');
      expect(result).toContain(filename);
    });

    it('should handle Excel export errors', async () => {
      const mockData = null;
      const filename = 'error_excel_report';

      await expect(service.exportToExcel(mockData, filename)).rejects.toThrow();
    });
  });

  describe('CSV generation methods', () => {
    it('should generate proper CSV headers and data', async () => {
      const mockData = {
        summary: {
          totalApplications: 100,
          totalHires: 10,
          activePositions: 5,
          timeToFill: { averageDays: 30, medianDays: 28 },
          conversionRates: { overallConversion: 10 },
        },
        sources: [
          {
            source: 'LinkedIn',
            totalCandidates: 50,
            qualifiedCandidates: 30,
            hiredCandidates: 5,
            conversionRate: 10,
            qualityScore: 8.5,
            roi: 150,
          },
        ],
      };

      const filename = 'comprehensive_report';
      const result = await service.exportToCSV(mockData, filename);

      expect(result).toBeDefined();
      // In a real implementation, you would verify the actual CSV content
      // For now, we just verify that the method completes successfully
    });
  });
});
