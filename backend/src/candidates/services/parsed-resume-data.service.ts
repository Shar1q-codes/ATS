import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ParsedResumeData,
  Skill,
  WorkExperience,
} from '../../entities/parsed-resume-data.entity';
import { Candidate } from '../../entities/candidate.entity';
import { CreateParsedResumeDataDto } from '../dto/create-parsed-resume-data.dto';
import { UpdateParsedResumeDataDto } from '../dto/update-parsed-resume-data.dto';
import { ParsedResumeDataResponseDto } from '../dto/parsed-resume-data-response.dto';

@Injectable()
export class ParsedResumeDataService {
  constructor(
    @InjectRepository(ParsedResumeData)
    private readonly parsedResumeDataRepository: Repository<ParsedResumeData>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
  ) {}

  async create(
    createParsedResumeDataDto: CreateParsedResumeDataDto,
  ): Promise<ParsedResumeDataResponseDto> {
    // Verify candidate exists
    const candidate = await this.candidateRepository.findOne({
      where: { id: createParsedResumeDataDto.candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(
        `Candidate with ID ${createParsedResumeDataDto.candidateId} not found`,
      );
    }

    // Check if parsed data already exists for this candidate
    const existingParsedData = await this.parsedResumeDataRepository.findOne({
      where: { candidateId: createParsedResumeDataDto.candidateId },
    });

    if (existingParsedData) {
      throw new BadRequestException(
        `Parsed resume data already exists for candidate ${createParsedResumeDataDto.candidateId}`,
      );
    }

    // Calculate total experience from work experience
    const totalExperience = this.calculateTotalExperience(
      createParsedResumeDataDto.experience || [],
    );

    // Normalize skills
    const normalizedSkills = this.normalizeSkills(
      createParsedResumeDataDto.skills || [],
    );

    const parsedResumeData = this.parsedResumeDataRepository.create({
      ...createParsedResumeDataDto,
      skills: normalizedSkills,
    });

    const savedParsedData =
      await this.parsedResumeDataRepository.save(parsedResumeData);

    // Update candidate's total experience
    await this.candidateRepository.update(candidate.id, {
      totalExperience,
    });

    return this.toResponseDto(savedParsedData);
  }

  async findAll(): Promise<ParsedResumeDataResponseDto[]> {
    const parsedResumeDataList = await this.parsedResumeDataRepository.find({
      relations: ['candidate'],
      order: { createdAt: 'DESC' },
    });
    return parsedResumeDataList.map((data) => this.toResponseDto(data));
  }

  async findOne(id: string): Promise<ParsedResumeDataResponseDto> {
    const parsedResumeData = await this.parsedResumeDataRepository.findOne({
      where: { id },
      relations: ['candidate'],
    });

    if (!parsedResumeData) {
      throw new NotFoundException(`ParsedResumeData with ID ${id} not found`);
    }

    return this.toResponseDto(parsedResumeData);
  }

  async findByCandidateId(
    candidateId: string,
  ): Promise<ParsedResumeDataResponseDto | null> {
    const parsedResumeData = await this.parsedResumeDataRepository.findOne({
      where: { candidateId },
      relations: ['candidate'],
    });

    return parsedResumeData ? this.toResponseDto(parsedResumeData) : null;
  }

  async update(
    id: string,
    updateParsedResumeDataDto: UpdateParsedResumeDataDto,
  ): Promise<ParsedResumeDataResponseDto> {
    const parsedResumeData = await this.parsedResumeDataRepository.findOne({
      where: { id },
      relations: ['candidate'],
    });

    if (!parsedResumeData) {
      throw new NotFoundException(`ParsedResumeData with ID ${id} not found`);
    }

    // Normalize skills if they are being updated
    if (updateParsedResumeDataDto.skills) {
      updateParsedResumeDataDto.skills = this.normalizeSkills(
        updateParsedResumeDataDto.skills,
      );
    }

    // Recalculate total experience if work experience is being updated
    if (updateParsedResumeDataDto.experience) {
      const totalExperience = this.calculateTotalExperience(
        updateParsedResumeDataDto.experience,
      );
      await this.candidateRepository.update(parsedResumeData.candidateId, {
        totalExperience,
      });
    }

    Object.assign(parsedResumeData, updateParsedResumeDataDto);
    const updatedParsedData =
      await this.parsedResumeDataRepository.save(parsedResumeData);

    return this.toResponseDto(updatedParsedData);
  }

  async remove(id: string): Promise<void> {
    const result = await this.parsedResumeDataRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`ParsedResumeData with ID ${id} not found`);
    }
  }

  async getSkillsByCategory(
    candidateId: string,
  ): Promise<{ [category: string]: Skill[] }> {
    const parsedData = await this.parsedResumeDataRepository.findOne({
      where: { candidateId },
    });

    if (!parsedData || !parsedData.skills) {
      return {};
    }

    return parsedData.skills.reduce(
      (acc, skill) => {
        const category = skill.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(skill);
        return acc;
      },
      {} as { [category: string]: Skill[] },
    );
  }

  async updateSkillProficiency(
    id: string,
    skillName: string,
    proficiency: number,
  ): Promise<ParsedResumeDataResponseDto> {
    const parsedData = await this.parsedResumeDataRepository.findOne({
      where: { id },
    });

    if (!parsedData) {
      throw new NotFoundException(`ParsedResumeData with ID ${id} not found`);
    }

    if (!parsedData.skills) {
      throw new BadRequestException('No skills found in parsed resume data');
    }

    const skillIndex = parsedData.skills.findIndex(
      (skill) => skill.name.toLowerCase() === skillName.toLowerCase(),
    );

    if (skillIndex === -1) {
      throw new NotFoundException(
        `Skill '${skillName}' not found in parsed resume data`,
      );
    }

    parsedData.skills[skillIndex].proficiency = proficiency;
    const updatedParsedData =
      await this.parsedResumeDataRepository.save(parsedData);

    return this.toResponseDto(updatedParsedData);
  }

  private calculateTotalExperience(workExperience: WorkExperience[]): number {
    if (!workExperience || workExperience.length === 0) {
      return 0;
    }

    let totalMonths = 0;
    const currentDate = new Date();

    for (const experience of workExperience) {
      if (!experience.startDate) continue;

      const startDate = new Date(experience.startDate);
      const endDate = experience.isCurrent
        ? currentDate
        : experience.endDate
          ? new Date(experience.endDate)
          : currentDate;

      const monthsDiff =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      totalMonths += Math.max(0, monthsDiff);
    }

    // Convert months to years (rounded to 1 decimal place)
    return Math.round((totalMonths / 12) * 10) / 10;
  }

  private normalizeSkills(skills: Skill[]): Skill[] {
    if (!skills || skills.length === 0) {
      return [];
    }

    // Remove duplicates and normalize skill names
    const skillMap = new Map<string, Skill>();

    for (const skill of skills) {
      const normalizedName = skill.name.toLowerCase().trim();

      if (skillMap.has(normalizedName)) {
        // If skill already exists, keep the one with higher proficiency
        const existingSkill = skillMap.get(normalizedName)!;
        if ((skill.proficiency || 0) > (existingSkill.proficiency || 0)) {
          skillMap.set(normalizedName, {
            ...skill,
            name: this.capitalizeSkillName(skill.name),
          });
        }
      } else {
        skillMap.set(normalizedName, {
          ...skill,
          name: this.capitalizeSkillName(skill.name),
          category: this.categorizeSkill(skill.name, skill.category),
        });
      }
    }

    return Array.from(skillMap.values());
  }

  private capitalizeSkillName(skillName: string): string {
    // Handle common programming languages and technologies
    const specialCases: { [key: string]: string } = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      nodejs: 'Node.js',
      reactjs: 'React.js',
      vuejs: 'Vue.js',
      angularjs: 'Angular.js',
      mongodb: 'MongoDB',
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      aws: 'AWS',
      gcp: 'GCP',
      html: 'HTML',
      css: 'CSS',
      sql: 'SQL',
      api: 'API',
      rest: 'REST',
      graphql: 'GraphQL',
      docker: 'Docker',
      kubernetes: 'Kubernetes',
      git: 'Git',
      github: 'GitHub',
      gitlab: 'GitLab',
    };

    const lowerName = skillName.toLowerCase().trim();

    if (specialCases[lowerName]) {
      return specialCases[lowerName];
    }

    // Default capitalization
    return skillName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private categorizeSkill(
    skillName: string,
    existingCategory?: string,
  ): string {
    if (existingCategory) {
      return existingCategory;
    }

    const lowerName = skillName.toLowerCase();

    // Programming Languages
    const programmingLanguages = [
      'javascript',
      'typescript',
      'python',
      'java',
      'c++',
      'c#',
      'php',
      'ruby',
      'go',
      'rust',
      'swift',
      'kotlin',
    ];
    if (programmingLanguages.some((lang) => lowerName.includes(lang))) {
      return 'Programming Languages';
    }

    // Frameworks & Libraries
    const frameworks = [
      'react',
      'angular',
      'vue',
      'express',
      'django',
      'flask',
      'spring',
      'laravel',
      'rails',
    ];
    if (frameworks.some((fw) => lowerName.includes(fw))) {
      return 'Frameworks & Libraries';
    }

    // Databases
    const databases = [
      'mysql',
      'postgresql',
      'mongodb',
      'redis',
      'elasticsearch',
      'sqlite',
      'oracle',
    ];
    if (databases.some((db) => lowerName.includes(db))) {
      return 'Databases';
    }

    // Cloud & DevOps
    const cloudDevOps = [
      'aws',
      'azure',
      'gcp',
      'docker',
      'kubernetes',
      'jenkins',
      'terraform',
      'ansible',
    ];
    if (cloudDevOps.some((tool) => lowerName.includes(tool))) {
      return 'Cloud & DevOps';
    }

    // Tools & Technologies
    const tools = [
      'git',
      'github',
      'gitlab',
      'jira',
      'confluence',
      'slack',
      'figma',
      'photoshop',
    ];
    if (tools.some((tool) => lowerName.includes(tool))) {
      return 'Tools & Technologies';
    }

    return 'Other';
  }

  private toResponseDto(
    parsedResumeData: ParsedResumeData,
  ): ParsedResumeDataResponseDto {
    return {
      id: parsedResumeData.id,
      candidateId: parsedResumeData.candidateId,
      skills: parsedResumeData.skills,
      experience: parsedResumeData.experience,
      education: parsedResumeData.education,
      certifications: parsedResumeData.certifications,
      summary: parsedResumeData.summary,
      rawText: parsedResumeData.rawText,
      parsingConfidence: parsedResumeData.parsingConfidence,
      createdAt: parsedResumeData.createdAt,
      candidate: parsedResumeData.candidate,
    };
  }
}
