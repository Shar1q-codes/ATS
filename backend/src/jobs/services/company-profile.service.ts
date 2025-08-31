import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { CreateCompanyProfileDto } from '../dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from '../dto/update-company-profile.dto';
import { CompanyProfileResponseDto } from '../dto/company-profile-response.dto';

@Injectable()
export class CompanyProfileService {
  constructor(
    @InjectRepository(CompanyProfile)
    private readonly companyProfileRepository: Repository<CompanyProfile>,
  ) {}

  async create(
    createCompanyProfileDto: CreateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const companyProfile = this.companyProfileRepository.create(
      createCompanyProfileDto,
    );
    const savedCompanyProfile =
      await this.companyProfileRepository.save(companyProfile);
    return this.toResponseDto(savedCompanyProfile);
  }

  async findAll(): Promise<CompanyProfileResponseDto[]> {
    const companyProfiles = await this.companyProfileRepository.find({
      order: { createdAt: 'DESC' },
    });
    return companyProfiles.map((profile) => this.toResponseDto(profile));
  }

  async findOne(id: string): Promise<CompanyProfileResponseDto> {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { id },
      relations: ['jobVariants'],
    });

    if (!companyProfile) {
      throw new NotFoundException(`CompanyProfile with ID ${id} not found`);
    }

    return this.toResponseDto(companyProfile);
  }

  async findByName(name: string): Promise<CompanyProfileResponseDto[]> {
    const companyProfiles = await this.companyProfileRepository
      .createQueryBuilder('company')
      .where('LOWER(company.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .orderBy('company.createdAt', 'DESC')
      .getMany();

    return companyProfiles.map((profile) => this.toResponseDto(profile));
  }

  async update(
    id: string,
    updateCompanyProfileDto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { id },
    });

    if (!companyProfile) {
      throw new NotFoundException(`CompanyProfile with ID ${id} not found`);
    }

    // Handle preferences update properly
    if (updateCompanyProfileDto.preferences) {
      companyProfile.preferences = {
        ...companyProfile.preferences,
        ...updateCompanyProfileDto.preferences,
      };
    }

    // Update other fields
    const { preferences, ...otherFields } = updateCompanyProfileDto;
    Object.assign(companyProfile, otherFields);

    const updatedCompanyProfile =
      await this.companyProfileRepository.save(companyProfile);
    return this.toResponseDto(updatedCompanyProfile);
  }

  async updatePreferences(
    id: string,
    preferences: any,
  ): Promise<CompanyProfileResponseDto> {
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { id },
    });

    if (!companyProfile) {
      throw new NotFoundException(`CompanyProfile with ID ${id} not found`);
    }

    companyProfile.preferences = {
      ...companyProfile.preferences,
      ...preferences,
    };

    const updatedCompanyProfile =
      await this.companyProfileRepository.save(companyProfile);
    return this.toResponseDto(updatedCompanyProfile);
  }

  async remove(id: string): Promise<void> {
    const result = await this.companyProfileRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`CompanyProfile with ID ${id} not found`);
    }
  }

  private toResponseDto(
    companyProfile: CompanyProfile,
  ): CompanyProfileResponseDto {
    return {
      id: companyProfile.id,
      name: companyProfile.name,
      industry: companyProfile.industry,
      size: companyProfile.size,
      culture: companyProfile.culture,
      benefits: companyProfile.benefits,
      workArrangement: companyProfile.workArrangement,
      location: companyProfile.location,
      preferences: companyProfile.preferences,
      createdAt: companyProfile.createdAt,
      updatedAt: companyProfile.updatedAt,
    };
  }
}
