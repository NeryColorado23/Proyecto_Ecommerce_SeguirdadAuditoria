import { IsIn } from 'class-validator';

const LEVELS = ['none', 'viewer', 'editor'] as const;
type Level = (typeof LEVELS)[number];

export class UpdatePermissionsDto {
  @IsIn(LEVELS)
  ppc!: Level;

  @IsIn(LEVELS)
  search_terms!: Level;

  @IsIn(LEVELS)
  keywords!: Level;

  @IsIn(LEVELS)
  listings!: Level;
}
