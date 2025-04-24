'use client';

import React, { useEffect } from 'react'
import ContentSection from '@/features/settings/components/content-section'
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'
import { useProject } from '@/context/project-context'
import { useAuth } from '@/contexts/AuthContext'
import { updateProject } from '@/app/api/project/route'

// Separate schema for target URL
const targetUrlSchema = z.object({
  target_url: z.string().url({
    message: 'Please enter a valid URL.',
  }),
})

const transferSchema = z.object({
  transferType: z.enum(['user', 'team'], {
    required_error: 'Please select a transfer type.',
  }),
  searchQuery: z.string().optional(),
})

type TargetUrlFormValues = z.infer<typeof targetUrlSchema>
type TransferFormValues = z.infer<typeof transferSchema>

export default function SettingsPage() {
  const { selectedProject, refreshProject } = useProject();
  const { accessToken } = useAuth()

  const targetUrlForm = useForm<TargetUrlFormValues>({
    resolver: zodResolver(targetUrlSchema),
    defaultValues: {
      target_url: selectedProject?.target_url || '',
    },
  })

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transferType: 'user',
      searchQuery: '',
    },
  })

  // Update form when project data is loaded
  useEffect(() => {
    if (selectedProject?.target_url) {
      targetUrlForm.setValue('target_url', selectedProject.target_url);
    }
  }, [selectedProject, targetUrlForm]);

  async function onTargetUrlSubmit(data: TargetUrlFormValues) {
    try {
      console.log(selectedProject, accessToken);
      if (!selectedProject?.id || !accessToken) {
        throw new Error('Project ID or access token not found');
      }

      // Update project with new target_url
      await updateProject(accessToken, selectedProject.id, {
        target_url: data.target_url
      });

      // Refresh project data
      await refreshProject();

      toast({
        title: 'Success',
        description: 'Target URL updated successfully',
      });
    } catch (error) {
      console.error('Error updating target URL:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update target URL',
        variant: 'destructive',
      });
    }
  }

  function onTransferSubmit(data: TransferFormValues) {
    toast({
      title: 'Transfer Ownership',
      description: 'This feature is not implemented yet.',
    })
  }

  return (
    <ContentSection
      title='API Settings'
      desc='Manage your API settings, transfer ownership, and delete project.'
    >
      <div className='space-y-10'>
        {/* Target URL Form */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>API Configuration</h3>
          <Form {...targetUrlForm}>
            <form onSubmit={targetUrlForm.handleSubmit(onTargetUrlSubmit)} className='space-y-4'>
              <FormField
                control={targetUrlForm.control}
                name='target_url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://api.example.com'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The base URL for your API endpoints
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit'>Update Target URL</Button>
            </form>
          </Form>
        </div>

        {/* Transfer Ownership Form */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Transfer Ownership</h3>
          <p className='text-sm text-muted-foreground'>
            Transfer ownership of this API to another Veil user or team
          </p>
          <Form {...transferForm}>
            <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className='space-y-4'>
              <FormField
                control={transferForm.control}
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
                control={transferForm.control}
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
              <Button type='submit'>Transfer Ownership</Button>
            </form>
          </Form>
        </div>

        {/* Delete Project Section */}
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
    </ContentSection>
  )
}
