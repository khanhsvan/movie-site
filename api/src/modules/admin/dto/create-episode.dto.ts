import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateEpisodeDto {
  @IsString()
  @IsNotEmpty()
  seriesId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(1)
  seasonNumber!: number;

  @IsNumber()
  @Min(1)
  episodeNumber!: number;

  @IsNumber()
  @Min(1)
  durationSeconds!: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
