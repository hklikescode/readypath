import type { ChecklistRule, Household } from '../types';

export function runChecklist(family: Household, rules: ChecklistRule[]): { ready: string[]; missing: string[] } {
  const ready: string[] = [];
  const missing: string[] = [];

  for (const rule of rules) {
    let isReady = false;

    switch (rule.id) {
      case 'power-backup': {
        // Everyone with powerDevices must have a non-empty powerBackupPlan
        const powerUsers = family.people.filter((p) => (p.powerDevices?.length ?? 0) > 0);
        isReady = powerUsers.length > 0
          ? powerUsers.every((p) => !!p.powerBackupPlan && p.powerBackupPlan.trim().length > 0)
          : true;
        break;
      }

      case 'allergy-steps': {
        // Everyone with allergies has written steps
        const allergyPeople = family.people.filter((p) => !!p.allergies && p.allergies.trim().length > 0);
        isReady = allergyPeople.length > 0
          ? allergyPeople.every((p) => !!p.allergySteps?.en || !!p.allergySteps?.es)
          : true;
        break;
      }

      case 'contacts-two': {
        isReady = family.contacts.length >= 2;
        break;
      }

      case 'contact-out-of-town': {
        isReady = family.contacts.some((c) => c.outOfTown === true);
        break;
      }

      case 'home-address': {
        isReady = !!family.address && family.address.trim().length > 0;
        break;
      }

      case 'water-supplies': {
        // 1 gallon per person per day for 3 days
        const reqGallons = (family.people.length || 1) * 3;
        isReady = (family.supplies?.waterGallons ?? 0) >= reqGallons;
        break;
      }

      case 'flood-plan': {
        isReady = !!family.floodPlan && (!!family.floodPlan.en?.trim() || !!family.floodPlan.es?.trim());
        break;
      }

      case 'crossing-saved': {
        isReady = (family.crossings?.length ?? 0) >= 1 || family.noCrossingsNearMe === true;
        break;
      }

      default:
        // Any other rule defaults to ready
        isReady = true;
        break;
    }

    if (isReady) {
      ready.push(rule.id);
    } else {
      missing.push(rule.id);
    }
  }

  return { ready, missing };
}
