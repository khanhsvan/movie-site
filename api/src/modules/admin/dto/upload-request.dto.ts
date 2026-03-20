import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UploadRequestDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  @Min(1)
  fileSizeBytes!: number;

  @IsOptional()
  @IsString()
  checksum?: string;
}
