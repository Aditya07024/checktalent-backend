import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignRoleDto {
  @IsNotEmpty()
  @IsIn(['student', 'offcampus', 'campus'], {
    message: 'Role must be one of: student, offcampus, campus',
  })
  role: 'student' | 'offcampus' | 'campus';

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  photoURL?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  targetRole?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  batchYear?: string;
}
