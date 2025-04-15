import React from 'react'
import ContentSection from '@/features/settings/components/content-section'
import { AccountForm } from '@/features/settings/account/account-form'

export default function page() {
  return (
    <ContentSection
      title='Account'
      desc='Update your account settings. Set your preferred language and
          timezone.'
    >
      <AccountForm />
    </ContentSection>
  )
}
