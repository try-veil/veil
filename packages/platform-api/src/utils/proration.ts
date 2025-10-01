/**
 * Proration Utility
 *
 * Calculates prorated amounts for subscription upgrades and downgrades
 */

export interface ProrationResult {
  creditAmount: number; // Credit from old plan (unused portion)
  chargeAmount: number; // Charge for new plan (prorated)
  netAmount: number; // Net amount to charge (positive) or credit (negative)
  daysRemaining: number;
  totalDaysInPeriod: number;
  effectiveDate: Date;
  nextBillingDate: Date;
}

export interface SubscriptionChange {
  currentPrice: number;
  newPrice: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  changeDate: Date;
}

/**
 * Calculate proration for subscription change
 */
export function calculateProration(change: SubscriptionChange): ProrationResult {
  const {
    currentPrice,
    newPrice,
    currentPeriodStart,
    currentPeriodEnd,
    changeDate
  } = change;

  // Calculate time periods
  const totalDaysInPeriod = getDaysBetween(currentPeriodStart, currentPeriodEnd);
  const daysElapsed = getDaysBetween(currentPeriodStart, changeDate);
  const daysRemaining = getDaysBetween(changeDate, currentPeriodEnd);

  // Calculate daily rates
  const currentDailyRate = currentPrice / totalDaysInPeriod;
  const newDailyRate = newPrice / totalDaysInPeriod;

  // Calculate amounts
  const unusedAmount = currentDailyRate * daysRemaining; // Credit from old plan
  const proratedNewAmount = newDailyRate * daysRemaining; // Charge for new plan

  // Net amount (positive = charge, negative = credit)
  const netAmount = proratedNewAmount - unusedAmount;

  return {
    creditAmount: unusedAmount,
    chargeAmount: proratedNewAmount,
    netAmount: Math.round(netAmount * 100) / 100, // Round to 2 decimal places
    daysRemaining,
    totalDaysInPeriod,
    effectiveDate: changeDate,
    nextBillingDate: currentPeriodEnd
  };
}

/**
 * Calculate upgrade proration (more expensive plan)
 */
export function calculateUpgradeProration(change: SubscriptionChange): ProrationResult {
  const proration = calculateProration(change);

  // For upgrades, charge the difference immediately
  return {
    ...proration,
    netAmount: Math.max(0, proration.netAmount) // Never negative for upgrades
  };
}

/**
 * Calculate downgrade proration (less expensive plan)
 */
export function calculateDowngradeProration(
  change: SubscriptionChange,
  applyImmediately: boolean = false
): ProrationResult {
  const proration = calculateProration(change);

  if (applyImmediately) {
    // Apply immediately and credit the difference
    return {
      ...proration,
      netAmount: Math.min(0, proration.netAmount) // Never positive for immediate downgrades
    };
  } else {
    // Apply at end of billing period (no proration needed)
    return {
      creditAmount: 0,
      chargeAmount: 0,
      netAmount: 0,
      daysRemaining: proration.daysRemaining,
      totalDaysInPeriod: proration.totalDaysInPeriod,
      effectiveDate: proration.nextBillingDate, // Effective at period end
      nextBillingDate: proration.nextBillingDate
    };
  }
}

/**
 * Get number of days between two dates
 */
function getDaysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startMs = start.getTime();
  const endMs = end.getTime();
  return Math.max(0, Math.ceil((endMs - startMs) / msPerDay));
}

/**
 * Calculate prorated refund for cancellation
 */
export function calculateCancellationRefund(
  paidAmount: number,
  periodStart: Date,
  periodEnd: Date,
  cancellationDate: Date,
  refundPolicy: 'prorated' | 'none' | 'full' = 'prorated'
): number {
  if (refundPolicy === 'none') {
    return 0;
  }

  if (refundPolicy === 'full') {
    return paidAmount;
  }

  // Prorated refund
  const totalDays = getDaysBetween(periodStart, periodEnd);
  const daysUsed = getDaysBetween(periodStart, cancellationDate);
  const daysRemaining = getDaysBetween(cancellationDate, periodEnd);

  if (daysRemaining <= 0) {
    return 0; // Period already ended
  }

  const dailyRate = paidAmount / totalDays;
  const refundAmount = dailyRate * daysRemaining;

  return Math.round(refundAmount * 100) / 100;
}

/**
 * Format proration details for display
 */
export function formatProrationDetails(proration: ProrationResult): string {
  const lines: string[] = [];

  lines.push(`Days remaining in current period: ${proration.daysRemaining}`);
  lines.push(`Credit from current plan: $${proration.creditAmount.toFixed(2)}`);
  lines.push(`Prorated charge for new plan: $${proration.chargeAmount.toFixed(2)}`);

  if (proration.netAmount > 0) {
    lines.push(`Amount to charge now: $${proration.netAmount.toFixed(2)}`);
  } else if (proration.netAmount < 0) {
    lines.push(`Credit to apply: $${Math.abs(proration.netAmount).toFixed(2)}`);
  } else {
    lines.push(`No additional charge`);
  }

  lines.push(`Effective date: ${proration.effectiveDate.toISOString().split('T')[0]}`);
  lines.push(`Next billing date: ${proration.nextBillingDate.toISOString().split('T')[0]}`);

  return lines.join('\n');
}

/**
 * Calculate annual to monthly conversion proration
 */
export function calculateBillingCycleChangeProration(
  currentAnnualPrice: number,
  newMonthlyPrice: number,
  periodStart: Date,
  periodEnd: Date,
  changeDate: Date
): ProrationResult {
  // Calculate unused portion of annual plan
  const totalDays = getDaysBetween(periodStart, periodEnd);
  const daysUsed = getDaysBetween(periodStart, changeDate);
  const daysRemaining = getDaysBetween(changeDate, periodEnd);

  const dailyRate = currentAnnualPrice / totalDays;
  const unusedAmount = dailyRate * daysRemaining;

  // Calculate new monthly prorated amount (for remaining days)
  const monthlyDailyRate = newMonthlyPrice / 30; // Approximate month
  const proratedMonthlyAmount = monthlyDailyRate * Math.min(daysRemaining, 30);

  return {
    creditAmount: unusedAmount,
    chargeAmount: proratedMonthlyAmount,
    netAmount: proratedMonthlyAmount - unusedAmount,
    daysRemaining,
    totalDaysInPeriod: totalDays,
    effectiveDate: changeDate,
    nextBillingDate: new Date(changeDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from change
  };
}

/**
 * Validate proration inputs
 */
export function validateProrationInputs(change: SubscriptionChange): void {
  if (change.currentPrice < 0 || change.newPrice < 0) {
    throw new Error('Prices must be non-negative');
  }

  if (change.currentPeriodStart >= change.currentPeriodEnd) {
    throw new Error('Period start must be before period end');
  }

  if (change.changeDate < change.currentPeriodStart) {
    throw new Error('Change date must be within current billing period');
  }

  if (change.changeDate > change.currentPeriodEnd) {
    throw new Error('Change date must be within current billing period');
  }
}
