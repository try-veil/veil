"use client"
import { useState, useEffect } from 'react'
import {
  IconAdjustmentsHorizontal,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconFilter,
  IconApi
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
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getMarketplaceProjects } from '@/app/api/marketplace/route'
import { MarketplaceProject } from '@/app/api/marketplace/route'

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

export default function Marketplace() {
  const [sort, setSort] = useState('ascending')
  const [appType, setAppType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [projects, setProjects] = useState<MarketplaceProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Get token from your auth system - you'll need to implement this
        const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFyeWJyOGpUTXNNa0tYbzd1MjJ0Qm5XeVc2dyJ9.eyJhdWQiOiIyMTMwMWZkZC02NWJhLTQ2OWUtOTlmMy0xZjZlY2RlY2IzMjUiLCJleHAiOjE3ODEyMzcxODMsImlhdCI6MTc0NTIzNzE4MywiaXNzIjoidHJ5dmVpbC5mdXNpb25hdXRoLmlvIiwic3ViIjoiM2VjMjQ3MTgtYzAwOC00NDUwLWFjMmQtZjYyMTJhYTg0MDE1IiwianRpIjoiZTkyOWUyODctNjNjZC00YzlhLWI1YzMtMjcyYzZmMmJmNDM5IiwiYXV0aGVudGljYXRpb25UeXBlIjoiUEFTU1dPUkQiLCJhcHBsaWNhdGlvbklkIjoiMjEzMDFmZGQtNjViYS00NjllLTk5ZjMtMWY2ZWNkZWNiMzI1Iiwicm9sZXMiOlsicHJvdmlkZXIiXSwic2lkIjoiYTlhMmM0OWItN2RmOC00NTQyLWIzNzctZDgwNTczMDdhZDNlIiwiYXV0aF90aW1lIjoxNzQ1MjM3MTgzLCJ0aWQiOiJmZWI4MDE5YS01YmE2LTQwYzQtMzBhZC03NGQ3YzQ3OWZiOTAifQ.UjaGt3XuRSG0UlWrfcl4s9eQWanNS3Z0nQbYqA9V1Dxci9do0lkgbiJ2xDOYlTrkUe_O9MRm_2yKgGIGqgNZAyitgAWOwAS-az5okOfna7ATMcedc2JWGg3LSwawr3wLkYzS9nj0aACQRKxv3vzQtlPBeaFgHThwbPWQS30oGmT2tkpkuJsRasQr7PLtgyR9AqtUJR4M4AvhG8vUKUBBp4ekLs3-d9TOdtZnxQt3LLYMr_qIqnBaZBGu7CPXq3F_3tdObyR7mQoTDWARhi1oNw2PBDAXQ46wGEEBEKUaK7N8Uxi90mVLo73l58IKfKHdLrdUw3QolyHHoMFYAixI-A';
        const data = await getMarketplaceProjects(token);
        setProjects(data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch projects');
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projects
    .sort((a, b) =>
      sort === 'ascending'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((project) => project.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">{error}</div>;
  }

  return (
    <div className="flex w-full items-center justify-center pt-24 pb-4">
      <div className="flex h-[calc(100vh-7rem)] w-full max-w-7xl flex-col ">
        {/* Fixed Content Section */}
        <div className=" px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>
                API Marketplace
              </h1>
              <p className='text-muted-foreground'>
                Explore and connect with various APIs available in the marketplace
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder='Search APIs...'
                className='h-9 w-40 lg:w-[250px]'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <IconFilter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filters</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Category</p>
                    <Select value={appType} onValueChange={setAppType}>
                      <SelectTrigger className='w-full'>
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

                  <DropdownMenuSeparator />

                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Sort</p>
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger className='w-full'>
                        <SelectValue>
                          {sort === 'ascending' ? (
                            <div className='flex items-center gap-2'>
                              <IconSortAscendingLetters size={16} />
                              <span>Ascending</span>
                            </div>
                          ) : (
                            <div className='flex items-center gap-2'>
                              <IconSortDescendingLetters size={16} />
                              <span>Descending</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Scrollable Cards Section */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <ul className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredProjects.map((project) => (
              <Link href={`/consumer/${project.name}/playground`} key={project.id}>
              <li
                className='rounded-lg border p-4 hover:shadow-md'
              >
                <div className='mb-8 flex items-center justify-between'>
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg bg-muted p-2`}
                  >
                    <IconApi />
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900'
                  >
                    View Details
                  </Button>
                </div>
                <div>
                  <h2 className='mb-1 font-semibold'>{project.name}</h2>
                  <p className='line-clamp-2 text-gray-500'>{project.description}</p>
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
