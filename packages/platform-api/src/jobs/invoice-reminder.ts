import { PricingRepository } from '../repositories/pricing-repository';

/**
 * Background job to send reminders for pending/overdue invoices
 *
 * This job should run daily to:
 * 1. Find pending invoices approaching due date (e.g., 3 days before)
 * 2. Find overdue invoices
 * 3. Send reminder emails
 * 4. Update invoice status to 'overdue' if needed
 */

export interface InvoiceReminderResult {
  remindersProcessed: number;
  overdueMarked: number;
  errors: Array<{
    invoiceId: number;
    error: string;
  }>;
}

export class InvoiceReminderJob {
  private pricingRepository: PricingRepository;

  constructor() {
    this.pricingRepository = new PricingRepository();
  }

  /**
   * Main job execution method
   */
  async execute(): Promise<InvoiceReminderResult> {
    const startTime = Date.now();
    console.log('[InvoiceReminder] Starting job execution...');

    const result: InvoiceReminderResult = {
      remindersProcessed: 0,
      overdueMarked: 0,
      errors: []
    };

    try {
      // Process invoices approaching due date
      await this.processUpcomingInvoices(result);

      // Process overdue invoices
      await this.processOverdueInvoices(result);

      const duration = Date.now() - startTime;
      console.log(`[InvoiceReminder] Job completed in ${duration}ms`);
      console.log(`[InvoiceReminder] Results:`, result);

      return result;

    } catch (error) {
      console.error('[InvoiceReminder] Job execution failed:', error);
      throw error;
    }
  }

  /**
   * Process invoices that are approaching their due date
   */
  private async processUpcomingInvoices(result: InvoiceReminderResult): Promise<void> {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find pending invoices with due date within 3 days
      const upcomingInvoices = await this.pricingRepository.findInvoicesDueBetween(
        now,
        threeDaysFromNow,
        'pending'
      );

      console.log(`[InvoiceReminder] Found ${upcomingInvoices.length} invoices approaching due date`);

      for (const invoice of upcomingInvoices) {
        try {
          const daysUntilDue = Math.ceil(
            (new Date(invoice.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          console.log(`[InvoiceReminder] Invoice ${invoice.invoiceNumber} due in ${daysUntilDue} days`);

          // TODO: Send reminder email
          // await emailService.sendInvoiceReminder(invoice, daysUntilDue);

          result.remindersProcessed++;

        } catch (error) {
          console.error(`[InvoiceReminder] Error processing invoice ${invoice.id}:`, error);
          result.errors.push({
            invoiceId: invoice.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      console.error('[InvoiceReminder] Failed to process upcoming invoices:', error);
      throw error;
    }
  }

  /**
   * Process overdue invoices
   */
  private async processOverdueInvoices(result: InvoiceReminderResult): Promise<void> {
    try {
      const now = new Date();

      // Find pending invoices that are past due date
      const overdueInvoices = await this.pricingRepository.findOverdueInvoices();

      console.log(`[InvoiceReminder] Found ${overdueInvoices.length} overdue invoices`);

      for (const invoice of overdueInvoices) {
        try {
          const daysOverdue = Math.ceil(
            (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          console.log(`[InvoiceReminder] Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`);

          // Update status to overdue
          await this.pricingRepository.updateInvoiceStatus(invoice.id, 'overdue');
          result.overdueMarked++;

          // TODO: Send overdue notice
          // await emailService.sendOverdueNotice(invoice, daysOverdue);

          // Suspend subscription if invoice is more than 30 days overdue
          if (daysOverdue > 30) {
            console.warn(`[InvoiceReminder] Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue - consider suspending subscription`);
            // TODO: Suspend subscription
            // await subscriptionService.suspendSubscription(invoice.subscriptionId);
          }

        } catch (error) {
          console.error(`[InvoiceReminder] Error processing overdue invoice ${invoice.id}:`, error);
          result.errors.push({
            invoiceId: invoice.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      console.error('[InvoiceReminder] Failed to process overdue invoices:', error);
      throw error;
    }
  }

  /**
   * Dry run mode
   */
  async dryRun(): Promise<InvoiceReminderResult> {
    console.log('[InvoiceReminder] Running in DRY RUN mode...');

    const result: InvoiceReminderResult = {
      remindersProcessed: 0,
      overdueMarked: 0,
      errors: []
    };

    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingInvoices = await this.pricingRepository.findInvoicesDueBetween(
      now,
      threeDaysFromNow,
      'pending'
    );

    const overdueInvoices = await this.pricingRepository.findOverdueInvoices();

    console.log(`[InvoiceReminder] Would send reminders for ${upcomingInvoices.length} upcoming invoices`);
    console.log(`[InvoiceReminder] Would mark ${overdueInvoices.length} invoices as overdue`);

    return result;
  }
}

// Export singleton instance
export const invoiceReminderJob = new InvoiceReminderJob();