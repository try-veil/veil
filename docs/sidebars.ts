import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'API Documentation',
      items: [
        'intro',
        {
          type: 'category',
          label: 'Provider APIs',
          items: [
            'api/provider/onboarding',
            'api/provider/validate',
            'api/provider/update',
            'api/provider/delete',
          ],
        },
        {
          type: 'category',
          label: 'Consumer APIs',
          items: [
            'api/user/register',
            'api/user/api-keys',
            'api/consumer/subscriptions',
          ],
        },
        {
          type: 'category',
          label: 'Analytics APIs',
          items: [
            'api/analytics/usage',
            'api/analytics/rate-limits',
          ],
        },
        {
          type: 'category',
          label: 'Billing APIs',
          items: [
            'api/billing/reports',
            'api/billing/invoices',
            'api/billing/payment-methods',
            'api/billing/charges',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
