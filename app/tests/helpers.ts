import { demoHousehold } from '../lib/rules';
import type { Person } from '../lib/types';

export const demo = demoHousehold();
export const person = (id: string): Person => {
  const p = demo.people.find((x) => x.id === id);
  if (!p) throw new Error(`no demo person ${id}`);
  return p;
};
