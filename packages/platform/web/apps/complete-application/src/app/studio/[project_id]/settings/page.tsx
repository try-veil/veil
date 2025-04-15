import React from 'react'
import ContentSection from '@/features/settings/components/content-section'
import { ApiForm } from '@/features/settings/api/api-form'

export default function page() {
  return (
    <ContentSection
      title='API Settings'
      desc='Manage your API settings, transfer ownership, and delete project.'
    >
      <ApiForm />
    </ContentSection>
  )
}
