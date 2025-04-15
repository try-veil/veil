import React from 'react'
import ContentSection from '@/features/settings/components/content-section'
import { AppearanceForm } from '@/features/settings/appearance/appearance-form'
export default function page() {
  return (
    <ContentSection
    title='Appearance'
    desc='Customize the appearance of the app. Automatically switch between day
        and night themes.'
  >
    <AppearanceForm />
  </ContentSection>
  )
}
