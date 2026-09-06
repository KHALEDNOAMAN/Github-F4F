import fs from 'fs';
import path from 'path';
import {createLogger, format, transports} from 'winston';
import chalk from 'chalk';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, {recursive: true});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    format.printf(({timestamp, level, message}) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new transports.File({filename: path.join(logDir, 'app.log')}),
  ],
});

function formatStatusLabel(status) {
  const s = (status || '').toString().toUpperCase();
  if (s.includes('SUCCESS')) return chalk.green(s);
  if (s.includes('ERROR') || s.includes('FAIL')) return chalk.red(s);
  if (s.includes('WARN')) return chalk.yellow(s);
  if (s.includes('CAPTCHA')) return chalk.magenta(s);
  return chalk.cyan(s);
}

let defaultTag = 'App';

function setTag(t) {
  defaultTag = t || defaultTag;
}

function logLine(tag = null, status = 'INFO', message = '', code) {
  const usedTag = tag || defaultTag;
  const tagPart = chalk.bold.blue(`[${usedTag}]`);
  const statusPart = `[${formatStatusLabel(status)}]`;
  const msgPart = chalk.white(message);
  const codePart = code ? chalk.dim(` ${code}`) : '';
  // full styled line: timestamp + tag + status + message + code
  const time = chalk.gray(new Date().toISOString().replace('T', ' ').split('.')[0]);
  console.log(`${time} ${tagPart} ${statusPart} | ${msgPart}${codePart}`);
  // persist to file via winston without ANSI
  logger.info(`${usedTag} ${status} | ${message} ${code || ''}`);
}

export {logger, logLine, setTag};
