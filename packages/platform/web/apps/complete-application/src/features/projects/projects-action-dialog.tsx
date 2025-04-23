'use client'

import { z } from 'zod'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { createProject } from '@/app/api/project/route'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface AddForm {
  name: string;
  thumbnail?: File;
  description?: string;
  favorite?: boolean;
  enableLimitsToAPIs?: boolean;
}

// Schema
const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  thumbnail: z
    .any()
    .optional()
    .refine(
      (file) =>
        file === undefined ||
        (file instanceof File && file.size > 0),
      { message: 'Invalid file.' }
    ),
  description: z.string().optional(),
  favorite: z.boolean().optional(),
  enableLimitsToAPIs: z.boolean().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ProjectsActionDialog({ open, onOpenChange, onSuccess }: Props) {
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { data: session } = useSession()

  const form = useForm<AddForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      thumbnail: undefined,
      description: '',
      favorite: false,
      enableLimitsToAPIs: false,
    },
  })

  const onSubmit = async (values: AddForm) => {
    try {
      setIsLoading(true)
      const { name, thumbnail, description, favorite, enableLimitsToAPIs } = values

      // Convert thumbnail file to base64 if it exists
      let thumbnailBase64: string | undefined = undefined
      if (thumbnail instanceof File) {
        thumbnailBase64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(thumbnail)
        })
      }

      // Create project object
      const projectData = {
        name,
        description,
        thumbnail: thumbnailBase64,
        favorite: favorite || false,
        enableLimitsToAPIs: enableLimitsToAPIs || false
      }

      const token = session?.user?.accessToken;
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const project = await createProject(projectData, token)

      toast({
        title: 'Success',
        description: 'Project created successfully',
      })

      // Reset form and close dialog
      form.reset()
      setSelectedLogo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onOpenChange(false)

      // Call onSuccess callback to refresh projects list
      onSuccess?.()
    } catch (error) {
      console.log('Error creating project:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create project',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        setSelectedLogo(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below and click save.
          </DialogDescription>
        </DialogHeader>
        <div className='-mr-4 h-[26.25rem] w-full overflow-y-auto py-1 pr-4'>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 p-0.5'
            >
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Project Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ✅ Custom Logo Upload with Preview */}
              <FormField
                control={form.control}
                name='thumbnail'
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <Label>Upload Logo</Label>
                    <div className='flex items-start gap-4'>
                      <div>
                        <Input
                          ref={fileInputRef}
                          type='file'
                          accept='image/jpeg,image/png'
                          className='h-9 w-full max-w-2xl'
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              onChange(file)
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setSelectedLogo(reader.result as string)
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                          value={value?.filename || ''}
                        />
                        <p className='text-sm text-muted-foreground mt-1'>
                          Maximum Size: 500 x 500px, JPEG / PNG
                        </p>
                        <FormMessage />
                      </div>
                      <div className='w-24 h-24 border rounded-md overflow-hidden bg-muted flex items-center justify-center'>
                        {selectedLogo ? (
                          <Image
                            src={selectedLogo}
                            alt='Logo preview'
                            width={96}
                            height={96}
                            className='object-contain'
                          />
                        ) : (
                          <div className='flex flex-col items-center justify-center text-muted-foreground'>
                            <ImageIcon className='w-8 h-8 mb-1' />
                            <span className='text-xs'>No logo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder='Describe your project' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Add Project'}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
