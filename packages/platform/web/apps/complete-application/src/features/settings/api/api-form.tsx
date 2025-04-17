'use client'

import { z } from 'zod'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const apiFormSchema = z.object({
  transferType: z.enum(['user', 'team'], {
    required_error: 'Please select a transfer type.',
  }),
  searchQuery: z.string().optional(),
})

type ApiFormValues = z.infer<typeof apiFormSchema>

export function ApiForm() {
  const form = useForm<ApiFormValues>({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      transferType: 'user',
      searchQuery: '',
    },
  })

  function onSubmit(data: ApiFormValues) {
    toast({
      title: 'You submitted the following values:',
      description: (
        <pre className='mt-2 w-[340px] rounded-md bg-slate-950 p-4'>
          <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <div className='space-y-10'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>Transfer Ownership</h3>
            <p className='text-sm text-muted-foreground'>
              Transfer ownership of this API to another Veil user or team
            </p>
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='transferType'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>Transfer to</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex flex-col space-y-1'
                      >
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='user' />
                          </FormControl>
                          <FormLabel className='font-normal'>User</FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='team' />
                          </FormControl>
                          <FormLabel className='font-normal'>Team</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='searchQuery'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder='Search Veil users'
                        className='w-[300px]'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' className='mt-4'>
                Transfer Ownership
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <div className='space-y-4'>
        <h3 className='text-lg font-medium'>Delete API Project</h3>
        <p className='text-sm text-muted-foreground'>
          Permanently deleting this API project will remove it from the Veil Hub
          Listing, will destroy your team&apos;s data from Requests, Testing and
          Descriptions. This action is not reversible.
        </p>
        <Button variant='destructive'>Delete API Project</Button>
      </div>
    </div>
  )
} 