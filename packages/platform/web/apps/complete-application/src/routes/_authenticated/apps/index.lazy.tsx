import { createLazyFileRoute } from '@tanstack/react-router'
import Apps from '@/features/marketplace'

export const Route = createLazyFileRoute('/_authenticated/apps/')({
  component: Apps,
})
