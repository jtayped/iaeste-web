import * as migration_20260829_201004 from './20260829_201004';

export const migrations = [
  {
    up: migration_20260829_201004.up,
    down: migration_20260829_201004.down,
    name: '20260829_201004'
  },
];
