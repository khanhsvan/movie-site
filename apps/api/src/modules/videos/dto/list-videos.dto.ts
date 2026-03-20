import { IsEnum, IsOptional } from 'class-validator';
import { VideoType } from '@netflix-mini/types';

export class ListVideosDto {
  @IsOptional()
  @IsEnum(VideoType)
  type?: VideoType;
}

