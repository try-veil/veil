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

// Schema
const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  logo: z
    .any()
    .optional()
    .refine(
      (file) =>
        file === undefined ||
        (file instanceof File && file.size > 0),
      { message: 'Invalid file.' }
    ),
  description: z.string().min(1, { message: 'Description is required.' }),
})

type AddForm = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectsActionDialog({ open, onOpenChange }: Props) {
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<AddForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      logo: undefined,
      description: '',
    },
  })

  const onSubmit = async (values: AddForm) => {
    const { name, logo, description } = values

    toast({
      title: 'You submitted the following values:',
      description: (
        <pre className='mt-2 w-[340px] rounded-md bg-slate-950 p-4'>
          <code className='text-white'>{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })

    // Reset form and clear file input
    form.reset()
    setSelectedLogo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onOpenChange(false)
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
                name='logo'
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

              <Button type='submit'>Add Project</Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
