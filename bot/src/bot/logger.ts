import { logger } from 'wickrio-bot-api';
import winston from 'winston';

const existingFormats = logger.format;

const newFormat = winston.format.combine(
  winston.format.splat(),
  winston.format.prettyPrint({ depth: 4 }),
  existingFormats,
);

logger.format = newFormat;

export const WickrLogger = logger;
