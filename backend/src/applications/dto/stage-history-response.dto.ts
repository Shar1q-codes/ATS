import { User } from '../../entities/user.entity';

export class StageHistoryResponseDto {
  id: string;
  applicationId: string;
  fromStage?: string;
  toStage: string;
  changedById: string;
  changedAt: Date;
  notes?: string;
  automated: boolean;
  changedBy?: User;
}
