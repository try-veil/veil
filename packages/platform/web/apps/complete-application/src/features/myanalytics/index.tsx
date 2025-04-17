"use client"
import { useState } from 'react'
import {
  IconAdjustmentsHorizontal,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { apps } from './data/apps'
import Link from 'next/link'
const appText = new Map<string, string>([
  ['all', 'All Categories'],
  ['connected', 'AI'],
  ['notConnected', 'Analytics'],
  ['notConnected', 'Commerce'],
  ['notConnected', 'Content'],
  ['notConnected', 'Customer Support'],
  ['notConnected', 'Data'],
  ['notConnected', 'Marketing'],
])

export default function MyAnalytics() {
  const [sort, setSort] = useState('ascending')
  const [appType, setAppType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredApps = apps
    .sort((a, b) =>
      sort === 'ascending'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((app) =>
      appType === 'connected'
        ? app.connected
        : appType === 'notConnected'
          ? !app.connected
          : true
    )
    .filter((app) => app.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex h-[calc(100vh-12rem)] w-full max-w-7xl flex-col">
        {/* Fixed Content Section */}
        <div className="bg-background py-6">
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              My Analytics
            </h1>
            <p className='text-muted-foreground mb-4'>
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Consequuntur, iusto?
            </p>
          </div>
          <Separator className='shadow' />
        </div>

       <div className='h-full flex justify-center items-center'>
        Your Analytics will appear here
       </div>
      </div>
    </div>
  )
}
