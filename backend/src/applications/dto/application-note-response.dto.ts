import { User } from '../../entities/user.entity';

export class ApplicationNoteResponseDto {
  id: string;
  applicationId: string;
  userId: string;
  note: string;
  isInternal: boolean;
  createdAt: Date;
  user?: User;
}
