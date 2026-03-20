import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RestrictionReason, VideoAccessTier, VideoType, VideoVisibility } from '@netflix-mini/types';

export class CreateVideoDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(VideoType)
  type!: VideoType;

  @IsEnum(VideoAccessTier)
  accessTier!: VideoAccessTier;

  @IsNumber()
  @Min(1)
  durationSeconds!: number;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsEnum(VideoVisibility)
  visibility?: VideoVisibility;

  @IsOptional()
  @IsEnum(RestrictionReason)
  restrictionReason?: RestrictionReason;

  @IsOptional()
  @IsArray()
  allowedRegions?: string[];

  @IsOptional()
  @IsBoolean()
  requiresVerification?: boolean;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
