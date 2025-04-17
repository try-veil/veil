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

export default function MyProjects() {
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
        <div className="sticky top-32 z-10 bg-background py-6">
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              My Projects
            </h1>
            <p className='text-muted-foreground'>
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Consequuntur, iusto?
            </p>
          </div>
          <div className='my-4 flex items-end justify-between sm:my-0 sm:items-center'>
            <div className='flex flex-col gap-4 sm:my-4 sm:flex-row'>
              <Input
                placeholder='Search your APIs...'
                className='h-9 w-40 lg:w-[250px]'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={appType} onValueChange={setAppType}>
                <SelectTrigger className='w-36'>
                  <SelectValue>{appText.get(appType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Categories</SelectItem>
                  <SelectItem value='connected'>AI</SelectItem>
                  <SelectItem value='notConnected'>Analytics</SelectItem>
                  <SelectItem value='notConnected'>Commerce</SelectItem>
                  <SelectItem value='notConnected'>Content</SelectItem>
                  <SelectItem value='notConnected'>Customer Support</SelectItem>
                  <SelectItem value='notConnected'>Data</SelectItem>
                  <SelectItem value='notConnected'>Marketing</SelectItem>
                  
                </SelectContent>
              </Select>
            </div>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className='w-16'>
                <SelectValue>
                  <IconAdjustmentsHorizontal size={18} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent align='end'>
                <SelectItem value='ascending'>
                  <div className='flex items-center gap-4'>
                    <IconSortAscendingLetters size={16} />
                    <span>Ascending</span>
                  </div>
                </SelectItem>
                <SelectItem value='descending'>
                  <div className='flex items-center gap-4'>
                    <IconSortDescendingLetters size={16} />
                    <span>Descending</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator className='shadow' />
        </div>

        {/* Scrollable Cards Section */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <ul className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredApps.map((app) => (
              <Link href={`/studio/${app.name}`} key={app.name}>
              <li
                className='rounded-lg border p-4 hover:shadow-md'
              >
                <div className='mb-8 flex items-center justify-between'>
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg bg-muted p-2`}
                  >
                    {app.logo}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className={`${app.connected ? 'border border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900' : ''}`}
                  >
                    {app.connected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
                <div>
                  <h2 className='mb-1 font-semibold'>{app.name}</h2>
                  <p className='line-clamp-2 text-gray-500'>{app.desc}</p>
                </div>
              </li>
              </Link>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
