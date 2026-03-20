import { IsString } from 'class-validator';

export class VerifyLicenseDto {
  @IsString()
  licenseId!: string;
}

