import React from 'react'
import ContentSection from '@/features/settings/components/content-section'
import { DisplayForm } from '@/features/settings/display/display-form'

export default function page() {
  return (
    <ContentSection
    title='Display'
    desc="Turn items on or off to control what's displayed in the app."
  >
    <DisplayForm />
  </ContentSection>
  )
}
