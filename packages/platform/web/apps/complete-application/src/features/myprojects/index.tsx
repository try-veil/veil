"use client"
import { useState } from 'react'
import { IconAdjustmentsHorizontal, IconSortAscendingLetters, IconSortDescendingLetters } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ProjectsActionDialog } from '../projects/projects-action-dialog'
import { Project } from '@/app/api/project/route'
import { useProject } from '@/context/project-context'
interface Props {
  projects: Project[]
  onProjectsChange: () => void
}

export default function MyProjects({ projects, onProjectsChange }: Props) {
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState('ascending')
  const [searchTerm, setSearchTerm] = useState('')
  const { setSelectedProjectId } = useProject();  
  const filteredProjects = projects
    .sort((a, b) =>
      sort === 'ascending'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((project) => project.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex h-[calc(100vh-10rem)] w-full max-w-7xl flex-col">
        {/* Fixed Content Section */}
        <div className="bg-background py-6">
          <div className='flex justify-between'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>My Projects</h1>
              <p className='text-muted-foreground'>Manage your API projects and settings</p>
            </div>
            <div>
              <Button variant="default" onClick={() => setOpen(true)}>Add Project</Button>
              <ProjectsActionDialog open={open} onOpenChange={setOpen} onSuccess={onProjectsChange} />
            </div>
          </div>
          <div className='my-4 flex items-end justify-between sm:my-0 sm:items-center'>
            <div className='flex flex-col gap-4 sm:my-4 sm:flex-row'>
              <Input
                placeholder='Search projects...'
                className='h-9 w-40 lg:w-[250px]'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className='w-36'>
                  <SelectValue>
                    {sort === 'ascending' ? 'A to Z' : 'Z to A'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ascending'>
                    <div className='flex items-center gap-4'>
                      <IconSortAscendingLetters size={16} />
                      <span>A to Z</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='descending'>
                    <div className='flex items-center gap-4'>
                      <IconSortDescendingLetters size={16} />
                      <span>Z to A</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator className='shadow' />
        </div>

        {/* Scrollable Cards Section */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredProjects.map((project) => (
              <Link href={`/projects/${project.id}/hub-listing`} key={project.name} >
                <div className='rounded-lg border p-4 hover:shadow-md'>
                  <div className='mb-4 flex items-center space-x-4'>
                    <div className='h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted'>
                      {project.thumbnail ? (
                        <img 
                          src={project.thumbnail} 
                          alt={project.name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center bg-muted'>
                          <span className='text-2xl font-bold text-muted-foreground'>
                            {project.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className='flex-grow'>
                      <h2 className='font-semibold'>{project.name}</h2>
                      <p className='text-sm text-muted-foreground line-clamp-1'>
                        {project.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
