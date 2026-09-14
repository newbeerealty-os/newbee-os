// 内置 Playbook（Day 10 起改为从 playbooks 表读；JSON 仍是"源码"，用 scripts/import-playbook.ts 导入）
import seller from '../playbooks/seller.json' with { type: 'json' };
import { PlaybookSchema } from './schemas/playbook';
import type { Playbook } from './types/domain';

export const SELLER_PLAYBOOK: Playbook = PlaybookSchema.parse(seller) as Playbook;
export const BUILTIN_PLAYBOOKS: Record<string, Playbook> = { seller: SELLER_PLAYBOOK };
