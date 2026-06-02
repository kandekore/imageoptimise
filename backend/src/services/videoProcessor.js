import fs from 'node:fs/promises';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import pLimit from 'p-limit';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);

// CRF values tuned for web delivery. Lower = higher quality / larger file.
// H.265 uses a ~6 point lower CRF to match H.264 visual quality at smaller sizes.
const CRF_H264 = { high: 20, medium: 24, low: 28 };
const CRF_H265 = { high: 24, medium: 28, low: 32 };

const ALLOWED_CODECS = new Set(['h264', 'h265']);

export function normaliseVideoSettings(raw = {}) {
  const codec = ALLOWED_CODECS.has(String(raw.codec).toLowerCase())
    ? String(raw.codec).toLowerCase()
    : 'h264';
  const maxWidth = Math.max(320, Math.min(parseInt(raw.maxWidth, 10) || 1920, 3840));
  const compression = ['high', 'medium', 'low'].includes(raw.compression)
    ? raw.compression
    : 'medium';
  const stripAudio = Boolean(raw.stripAudio);
  const fpsCap = raw.fpsCap === 0 || raw.fpsCap === '0' ? 0 : parseInt(raw.fpsCap, 10) || 30;

  return { codec, maxWidth, compression, stripAudio, fpsCap };
}

function resolveCrf(codec, compression) {
  return codec === 'h265' ? CRF_H265[compression] : CRF_H264[compression];
}

function probe(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

function buildCommand(inputPath, outputPath, settings, srcMeta) {
  const crf = resolveCrf(settings.codec, settings.compression);
  const videoCodec = settings.codec === 'h265' ? 'libx265' : 'libx264';

  const cmd = ffmpeg(inputPath).videoCodec(videoCodec);

  // Only downscale — never upscale. The -2 keeps height even (required by H.264/H.265).
  const srcWidth = srcMeta?.streams?.find((s) => s.width)?.width;
  if (srcWidth && srcWidth > settings.maxWidth) {
    cmd.videoFilter(`scale='min(${settings.maxWidth},iw)':-2`);
  }

  if (settings.fpsCap > 0) {
    cmd.outputOptions(['-r', String(settings.fpsCap)]);
  }

  const outputOptions = [
    `-crf ${crf}`,
    '-preset medium',
    '-pix_fmt yuv420p',
    '-movflags +faststart', // enables progressive playback on the web
  ];

  if (settings.codec === 'h265') {
    outputOptions.push('-tag:v hvc1'); // Safari/QuickTime compatibility
  }

  cmd.outputOptions(outputOptions);

  if (settings.stripAudio) {
    cmd.noAudio();
  } else {
    cmd.audioCodec('aac').audioBitrate('128k');
  }

  cmd.format('mp4').output(outputPath);
  return cmd;
}

async function processOne(file, settings) {
  const id = nanoid(12);
  const outputFilename = `${id}.mp4`;
  const outputPath = path.join(config.paths.processedDir, outputFilename);

  const srcStat = await fs.stat(file.path);
  const srcMeta = await probe(file.path).catch(() => null);
  const srcDuration = srcMeta?.format?.duration ? Number(srcMeta.format.duration) : null;
  const videoStream = srcMeta?.streams?.find((s) => s.codec_type === 'video');
  const srcWidth = videoStream?.width || null;
  const srcHeight = videoStream?.height || null;

  await new Promise((resolve, reject) => {
    buildCommand(file.path, outputPath, settings, srcMeta)
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .run();
  });

  const outStat = await fs.stat(outputPath);
  const outMeta = await probe(outputPath).catch(() => null);
  const outVideo = outMeta?.streams?.find((s) => s.codec_type === 'video');

  await fs.unlink(file.path).catch(() => {});

  return {
    id,
    type: 'video',
    originalName: file.originalname,
    processedFilename: outputFilename,
    processedPath: outputPath,
    previewUrl: `/video/preview/${outputFilename}`,
    format: 'mp4',
    extension: 'mp4',
    codec: settings.codec,
    width: outVideo?.width || null,
    height: outVideo?.height || null,
    duration: srcDuration,
    size: outStat.size,
    originalSize: srcStat.size,
    originalWidth: srcWidth,
    originalHeight: srcHeight,
    hasAudio: !settings.stripAudio,
    createdAt: Date.now(),
  };
}

export async function processVideoBatch(files, settings) {
  const limit = pLimit(Math.max(1, config.videoConcurrency));
  const tasks = files.map((file) =>
    limit(async () => {
      try {
        return await processOne(file, settings);
      } catch (err) {
        await fs.unlink(file.path).catch(() => {});
        return {
          error: true,
          originalName: file.originalname,
          message: err?.message || 'Failed to process video',
        };
      }
    }),
  );
  return Promise.all(tasks);
}
