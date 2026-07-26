import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

const TMP_DIR = path.join(process.cwd(), 'tmp');

export type SupportedFormat = 'mp4' | 'mp3' | 'wav' | 'aac' | 'm4a' | 'webm' | 'mov' | 'gif';

export class FFmpegPipeline {
  /**
   * Converts a local media file to the requested target format.
   */
  public static convert(inputPath: string, targetFormat: SupportedFormat): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR, { recursive: true });
      }

      const fileId = uuidv4();
      const outputPath = path.join(TMP_DIR, `${fileId}.${targetFormat}`);

      let command = ffmpeg(inputPath);

      if (targetFormat === 'mp3') {
        command = command.toFormat('mp3').audioBitrate('192k').noVideo();
      } else if (targetFormat === 'wav') {
        command = command.toFormat('wav').noVideo();
      } else if (targetFormat === 'aac') {
        command = command.toFormat('aac').noVideo();
      } else if (targetFormat === 'm4a') {
        command = command.toFormat('m4a').noVideo();
      } else if (targetFormat === 'gif') {
        command = command.toFormat('gif').fps(15);
      } else {
        command = command.toFormat(targetFormat);
      }

      command
        .on('end', () => resolve(outputPath))
        .on('error', (err: any) => reject(new Error(`FFmpeg conversion failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Extracts audio from a media stream or file.
   */
  public static extractAudio(inputPath: string, targetFormat: 'mp3' | 'aac' | 'wav' | 'm4a' = 'mp3'): Promise<string> {
    return this.convert(inputPath, targetFormat);
  }
}
