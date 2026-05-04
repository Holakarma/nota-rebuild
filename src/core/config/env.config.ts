import type { StringValue } from 'ms';

type EnvironmentVariables = Record<string, unknown> & {
  JWT_ACCESS_TTL: StringValue;
  JWT_REFRESH_TTL: StringValue;
};

const MS_STRING_VALUE_PATTERN =
  /^-?(?:\d+)?\.?\d+ *(?:milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i;

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const errors: string[] = [];

  validateMsStringValue(config, 'JWT_ACCESS_TTL', errors);
  validateMsStringValue(config, 'JWT_REFRESH_TTL', errors);

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join('; ')}`);
  }

  return {
    ...config,
    JWT_ACCESS_TTL: config.JWT_ACCESS_TTL as StringValue,
    JWT_REFRESH_TTL: config.JWT_REFRESH_TTL as StringValue,
  };
}

function validateMsStringValue(
  config: Record<string, unknown>,
  key: string,
  errors: string[],
) {
  const value = config[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${key} must be a non-empty ms time string`);
    return;
  }

  if (!MS_STRING_VALUE_PATTERN.test(value)) {
    errors.push(`${key} must match ms format, for example "15m", "2h", "7d"`);
    return;
  }

  const numericValue = Number.parseFloat(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    errors.push(`${key} must be greater than 0`);
  }
}
