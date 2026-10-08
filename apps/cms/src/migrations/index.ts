import * as migration_20260829_201004 from './20260829_201004';
import * as migration_20261008_165641_add_experiences from './20261008_165641_add_experiences';

export const migrations = [
  {
    up: migration_20260829_201004.up,
    down: migration_20260829_201004.down,
    name: '20260829_201004',
  },
  {
    up: migration_20261008_165641_add_experiences.up,
    down: migration_20261008_165641_add_experiences.down,
    name: '20261008_165641_add_experiences'
  },
];
