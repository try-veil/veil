import { toast } from '@/hooks/use-toast'

export function handleServerError(error: unknown) {
  // eslint-disable-next-line no-console
  console.log(error)

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Content not found.'
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    errMsg = error.message || errMsg
  }

  // Handle fetch response errors
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'title' in error.response.data
  ) {
    errMsg = error.response.data.title as string
  }

  toast({ variant: 'destructive', title: errMsg })
}
