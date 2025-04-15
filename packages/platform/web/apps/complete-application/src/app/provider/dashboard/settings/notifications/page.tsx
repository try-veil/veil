import React from 'react'
import ContentSection from '@/features/settings/components/content-section'
import { NotificationsForm } from '@/features/settings/notifications/notifications-form'

export default function page() {
  return (
    <ContentSection
    title='Notifications'
    desc='Configure how you receive notifications.'
  >
    <NotificationsForm />
  </ContentSection>
  )
}
