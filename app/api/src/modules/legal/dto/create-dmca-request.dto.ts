import { IsEmail, IsString, IsUrl } from 'class-validator';

export class CreateDmcaRequestDto {
  @IsString()
  reporterName!: string;

  @IsEmail()
  reporterEmail!: string;

  @IsUrl()
  contentUrl!: string;

  @IsString()
  reason!: string;
}

