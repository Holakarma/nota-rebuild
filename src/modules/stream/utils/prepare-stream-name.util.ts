import { BadRequestException } from '@nestjs/common';

export type PreparedStreamName = {
  name: string;
  normalizedName: string;
};

export function prepareStreamName(rawName: string): PreparedStreamName {
  const name = rawName.trim().replace(/\s+/g, ' ');

  if (!name) {
    throw new BadRequestException('Stream name is required');
  }

  return {
    name,
    normalizedName: name.toLowerCase(),
  };
}
