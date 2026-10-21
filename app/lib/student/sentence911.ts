import type { Person, Script911 } from '../types';

export function build911Sentence(
  caller: Person,
  patient: Person,
  situation: string,
  address: string,
  phrases: Script911,
): string {
  // 1. Look up relation key like "grandparent>kid" or "parent>kid"
  const relKey = `${caller.role}>${patient.role}`;
  const relation = phrases.relations[relKey] || 'family member';

  // 2. Look up situation phrase or fallback to default
  const phrase = phrases.phrases[situation] || phrases.phrases.default || 'needs emergency help';

  // 3. Assemble: "My {relation}, {name}, age {age}, {phrase} at {address}."
  return `My ${relation}, ${patient.name}, age ${patient.age}, ${phrase} at ${address}.`;
}
