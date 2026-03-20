import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  contentTitle!: string;

  @IsString()
  ownerName!: string;

  @IsString()
  issuerOrganization!: string;

  @IsDateString()
  validityStart!: string;

  @IsDateString()
  validityEnd!: string;

  @IsArray()
  territory!: string[];

  @IsString()
  licenseDocumentName!: string;

  @IsOptional()
  @IsString()
  attachedVideoId?: string;
}

