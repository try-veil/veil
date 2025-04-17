import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React, { useState } from 'react'
import { dummyEndpoint } from './endpoints'
import { JsonViewer } from '@/features/projects/request/components/json-tree-viewer'

export default function EndpointViewer() {
  const [selectedLanguage, setSelectedLanguage] = useState('shell')
  const [selectedStatus, setSelectedStatus] = useState('200')
  const [selectedAuthType, setSelectedAuthType] = useState('api_key')

  const authTypes = {
    'api_key': 'API Key',
    'oauth2': 'OAuth 2.0',
    'bearer': 'Bearer Token'
  }

  const getAuthContent = () => {
    switch (selectedAuthType) {
      case 'api_key':
        return dummyEndpoint.auth.apiKey
      case 'oauth2':
        return dummyEndpoint.auth.oauth2
      case 'bearer':
        return dummyEndpoint.auth.bearerToken
      default:
        return null
    }
  }

  return (
    <div>
      <Tabs orientation="vertical" defaultValue="overview" className="space-y-4">
        <TabsList className="mx-4">
          <TabsTrigger value="overview">App</TabsTrigger>
          <TabsTrigger value="params">Params</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="auth">Authorizations</TabsTrigger>
          <TabsTrigger value="code">Code Snippets</TabsTrigger>
          <TabsTrigger value="example">Example Responses</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <div className="flex-grow overflow-y-auto overflow-x-auto p-4">
          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>App</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an app" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app1">App 1</SelectItem>
                    <SelectItem value="app2">App 2</SelectItem>
                    <SelectItem value="app3">App 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>V-Veil-Key</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a key" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="key1">Key 1</SelectItem>
                    <SelectItem value="key2">Key 2</SelectItem>
                    <SelectItem value="key3">Key 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Request URL</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a URL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url1">https://api.example.com/v1</SelectItem>
                    <SelectItem value="url2">https://api.example.com/v2</SelectItem>
                    <SelectItem value="url3">https://api.example.com/v3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="params" className="space-y-4">
            <div className="space-y-4">
              {dummyEndpoint.params.map((param) => (
                <div key={param.name} className="space-y-2">
                  <Label>{param.name} {param.required && <span className="text-red-500">*</span>}</Label>
                  <Input 
                    placeholder={`Enter ${param.name} (${param.type})`}
                    type={param.type === 'number' ? 'number' : 'text'}
                    defaultValue={param.value}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            <div className="space-y-4">
              {dummyEndpoint.headers.map((header) => (
                <div key={header.name} className="space-y-2">
                  <Label>{header.name}</Label>
                  <Input 
                    placeholder={`Enter ${header.name}`}
                    defaultValue={header.value}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="body" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <JsonViewer data={dummyEndpoint.body} rootName="body" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label>Authorization Type</Label>
                <Select value={selectedAuthType} onValueChange={setSelectedAuthType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select auth type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(authTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {authTypes[selectedAuthType as keyof typeof authTypes]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <JsonViewer 
                    data={getAuthContent()} 
                    rootName={selectedAuthType}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label>Target</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dummyEndpoint.codeSnippets).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardContent className="p-4">
                  <pre className="whitespace-pre-wrap overflow-x-auto">
                    {dummyEndpoint.codeSnippets[selectedLanguage as keyof typeof dummyEndpoint.codeSnippets].code}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="example" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dummyEndpoint.exampleResponses).map(([status, response]) => (
                      <SelectItem key={status} value={status}>
                        {status} - {response.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      selectedStatus === '200' ? 'bg-green-500' :
                      selectedStatus === '429' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></span>
                    <span>{dummyEndpoint.exampleResponses[selectedStatus as keyof typeof dummyEndpoint.exampleResponses].description}</span>
                    <span className="text-muted-foreground">({dummyEndpoint.exampleResponses[selectedStatus as keyof typeof dummyEndpoint.exampleResponses].mediaType})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <JsonViewer 
                    data={dummyEndpoint.exampleResponses[selectedStatus as keyof typeof dummyEndpoint.exampleResponses].data} 
                    rootName="response"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <JsonViewer data={dummyEndpoint.results} rootName="results" />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
