export class FfmpegService {
  buildCommand(sourcePath: string, outputDir: string) {
    return [
      'ffmpeg',
      '-i',
      sourcePath,
      '-filter_complex',
      '[0:v]split=3[v1][v2][v3];[v1]scale=w=640:h=360[v360];[v2]scale=w=1280:h=720[v720];[v3]scale=w=1920:h=1080[v1080]',
      '-map',
      '[v360]',
      '-map',
      '0:a?',
      '-map',
      '[v720]',
      '-map',
      '0:a?',
      '-map',
      '[v1080]',
      '-map',
      '0:a?',
      '-f',
      'hls',
      `${outputDir}/master.m3u8`
    ].join(' ');
  }
}

